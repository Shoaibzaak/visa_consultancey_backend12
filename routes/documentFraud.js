import express from 'express';
import multer from 'multer';
import { HfInference } from '@huggingface/inference';
import sharp from 'sharp';

const router = express.Router();

// Configure multer with memory storage (Vercel has read-only filesystem)
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, WebP, TIFF, and PDF are allowed.'));
        }
    }
});

// Initialize Hugging Face client
const getHfClient = () => {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
        throw new Error('HUGGINGFACE_API_TOKEN is not set in environment variables');
    }
    return new HfInference(token);
};

// ============================================================
// Helper: Convert image buffer to base64 for API calls
// ============================================================
async function imageToBase64(inputBuffer) {
    const imageBuffer = await sharp(inputBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    return imageBuffer.toString('base64');
}

// ============================================================
// Helper: Get image buffer for Hugging Face API
// ============================================================
async function getImageBuffer(inputBuffer) {
    return await sharp(inputBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
}

// ============================================================
// Helper: Analyze image metadata for tampering signs
// ============================================================
async function analyzeImageMetadata(inputBuffer) {
    const metadata = await sharp(inputBuffer).metadata();
    const fileSize = inputBuffer.length;

    const findings = [];
    let suspicionScore = 0;

    // Check image dimensions (unusually small or large)
    if (metadata.width < 200 || metadata.height < 200) {
        findings.push({
            type: 'LOW_RESOLUTION',
            severity: 'medium',
            detail: `Image resolution is very low (${metadata.width}x${metadata.height}). Legitimate documents are usually higher resolution.`
        });
        suspicionScore += 15;
    }

    // Check for unusual color spaces
    if (metadata.space && !['srgb', 'rgb', 'cmyk'].includes(metadata.space)) {
        findings.push({
            type: 'UNUSUAL_COLOR_SPACE',
            severity: 'low',
            detail: `Unusual color space detected: ${metadata.space}. This could indicate image manipulation.`
        });
        suspicionScore += 5;
    }

    // Check file size vs dimensions ratio (compressed too much = possible edit)
    const pixelCount = metadata.width * metadata.height;
    const bytesPerPixel = fileSize / pixelCount;
    if (bytesPerPixel < 0.1) {
        findings.push({
            type: 'HIGH_COMPRESSION',
            severity: 'medium',
            detail: 'Image is highly compressed relative to its dimensions. This may indicate multiple re-saves or editing.'
        });
        suspicionScore += 10;
    }

    // Check if image has alpha channel (documents usually don't)
    if (metadata.hasAlpha) {
        findings.push({
            type: 'ALPHA_CHANNEL',
            severity: 'low',
            detail: 'Image has an alpha (transparency) channel. Scanned documents typically do not have transparency.'
        });
        suspicionScore += 8;
    }

    // Check DPI (very low DPI may indicate screenshot/digital creation)
    if (metadata.density && metadata.density < 72) {
        findings.push({
            type: 'LOW_DPI',
            severity: 'medium',
            detail: `Low DPI detected (${metadata.density}). Authentic scanned documents usually have 150+ DPI.`
        });
        suspicionScore += 12;
    }

    return { findings, suspicionScore, metadata };
}

// ============================================================
// Helper: OCR text extraction using Hugging Face
// ============================================================
async function extractTextFromImage(hf, imageBuffer) {
    try {
        // Use a document OCR model
        const result = await hf.imageToText({
            model: 'Salesforce/blip-image-captioning-large',
            data: imageBuffer,
        });
        return result?.generated_text || '';
    } catch (error) {
        console.warn('OCR extraction warning:', error.message);
        return '';
    }
}

// ============================================================
// Helper: Image classification for document type
// ============================================================
async function classifyDocument(hf, imageBuffer) {
    try {
        const result = await hf.imageClassification({
            model: 'microsoft/dit-base-finetuned-rvlcdip',
            data: imageBuffer,
        });
        return result || [];
    } catch (error) {
        console.warn('Classification warning:', error.message);
        return [];
    }
}

// ============================================================
// Helper: Text-based fraud analysis using Hugging Face LLM
// ============================================================
async function analyzeTextForFraud(hf, extractedText, documentType) {
    try {
        const prompt = `Analyze this document text for potential fraud indicators. Document type: ${documentType}.

Text from document: "${extractedText}"

Check for:
1. Inconsistent formatting or spelling errors in official text
2. Missing standard elements (dates, signatures, official numbers)
3. Unusual language patterns
4. Signs of text manipulation

Provide a brief fraud risk assessment:`;

        const result = await hf.chatCompletion({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 300,
            temperature: 0.3
        });

        return result.choices[0].message.content || 'Unable to perform text analysis.';
    } catch (error) {
        console.warn('Text analysis warning:', error.message);
        return 'Text analysis unavailable - model may be loading. Try again in a few seconds.';
    }
}

// ============================================================
// Helper: Visual anomaly detection
// ============================================================
async function detectVisualAnomalies(inputBuffer) {
    const findings = [];
    let suspicionScore = 0;

    try {
        const image = sharp(inputBuffer);
        const { data, info } = await image
            .resize(512, 512, { fit: 'fill' })
            .raw()
            .toBuffer({ resolveWithObject: true });

        // Analyze color distribution for uniformity (signs of digital editing)
        const colorHistogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 3) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            colorHistogram[gray]++;
        }

        // Check for unusual spikes in histogram (sign of flat color fills / editing)
        const totalPixels = info.width * info.height;
        const maxBinValue = Math.max(...colorHistogram);
        const dominantColorRatio = maxBinValue / totalPixels;

        if (dominantColorRatio > 0.25) {
            findings.push({
                type: 'UNIFORM_COLOR_REGION',
                severity: 'medium',
                detail: `Large uniform color regions detected (${(dominantColorRatio * 100).toFixed(1)}% of image). This may indicate digitally created or heavily edited content.`
            });
            suspicionScore += 15;
        }

        // Check for edge inconsistencies (sharp vs. blurry edges mixed = possible paste)
        const edgeValues = [];
        for (let y = 1; y < info.height - 1; y++) {
            for (let x = 1; x < info.width - 1; x++) {
                const idx = (y * info.width + x) * 3;
                const idxLeft = (y * info.width + (x - 1)) * 3;
                const idxRight = (y * info.width + (x + 1)) * 3;

                const gradX = Math.abs(data[idx] - data[idxLeft]) + Math.abs(data[idx] - data[idxRight]);
                edgeValues.push(gradX);
            }
        }

        // Calculate edge variance
        const avgEdge = edgeValues.reduce((a, b) => a + b, 0) / edgeValues.length;
        const edgeVariance = edgeValues.reduce((sum, val) => sum + Math.pow(val - avgEdge, 2), 0) / edgeValues.length;

        if (edgeVariance > 2000) {
            findings.push({
                type: 'EDGE_INCONSISTENCY',
                severity: 'low',
                detail: 'Mixed edge sharpness detected across the document. This could indicate content was pasted from different sources.'
            });
            suspicionScore += 8;
        }

        // Check for noise level inconsistency (different areas have different noise = editing)
        const quadrantNoise = [];
        const qw = Math.floor(info.width / 2);
        const qh = Math.floor(info.height / 2);

        for (let qy = 0; qy < 2; qy++) {
            for (let qx = 0; qx < 2; qx++) {
                let noiseSum = 0;
                let count = 0;
                for (let y = qy * qh; y < (qy + 1) * qh - 1; y++) {
                    for (let x = qx * qw; x < (qx + 1) * qw - 1; x++) {
                        const idx = (y * info.width + x) * 3;
                        const idxNext = (y * info.width + (x + 1)) * 3;
                        noiseSum += Math.abs(data[idx] - data[idxNext]);
                        count++;
                    }
                }
                quadrantNoise.push(noiseSum / count);
            }
        }

        const avgNoise = quadrantNoise.reduce((a, b) => a + b, 0) / quadrantNoise.length;
        const noiseVariance = quadrantNoise.reduce((sum, val) => sum + Math.pow(val - avgNoise, 2), 0) / quadrantNoise.length;

        if (noiseVariance > 50) {
            findings.push({
                type: 'NOISE_INCONSISTENCY',
                severity: 'high',
                detail: 'Different noise levels detected across document quadrants. This is a strong indicator of content splicing or digital manipulation.'
            });
            suspicionScore += 20;
        }

    } catch (error) {
        console.warn('Visual analysis warning:', error.message);
    }

    return { findings, suspicionScore };
}

// ============================================================
// MAIN ROUTE: POST /api/document-fraud/analyze
// ============================================================
router.post('/analyze', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No document file uploaded. Please upload an image of the document.'
            });
        }

        console.log(`📄 Analyzing document: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

        const documentType = req.body.documentType || 'unknown';
        const results = {
            fileName: req.file.originalname,
            fileSize: req.file.size,
            documentType,
            analysisTimestamp: new Date().toISOString(),
            overallRiskScore: 0,
            riskLevel: 'LOW',
            findings: [],
            aiAnalysis: {},
            recommendations: []
        };

        // ---- Step 1: Image Metadata Analysis ----
        const fileBuffer = req.file.buffer;

        console.log('🔍 Step 1: Analyzing image metadata...');
        const metadataAnalysis = await analyzeImageMetadata(fileBuffer);
        results.findings.push(...metadataAnalysis.findings);
        results.overallRiskScore += metadataAnalysis.suspicionScore;
        results.aiAnalysis.imageMetadata = {
            width: metadataAnalysis.metadata.width,
            height: metadataAnalysis.metadata.height,
            format: metadataAnalysis.metadata.format,
            colorSpace: metadataAnalysis.metadata.space,
            dpi: metadataAnalysis.metadata.density || 'unknown',
            hasAlpha: metadataAnalysis.metadata.hasAlpha || false
        };

        // ---- Step 2: Visual Anomaly Detection ----
        console.log('🔍 Step 2: Detecting visual anomalies...');
        const visualAnalysis = await detectVisualAnomalies(fileBuffer);
        results.findings.push(...visualAnalysis.findings);
        results.overallRiskScore += visualAnalysis.suspicionScore;

        // ---- Step 3: Hugging Face AI Analysis ----
        let hfAvailable = false;
        try {
            const hf = getHfClient();
            hfAvailable = true;

            const imageBuffer = await getImageBuffer(fileBuffer);

            // 3a: Document Classification
            console.log('🤖 Step 3a: Classifying document type...');
            const classification = await classifyDocument(hf, imageBuffer);
            results.aiAnalysis.documentClassification = classification.slice(0, 5).map(c => ({
                label: c.label,
                confidence: (c.score * 100).toFixed(2) + '%'
            }));

            // Check if document type matches expected type
            if (documentType !== 'unknown' && classification.length > 0) {
                const topLabel = classification[0].label.toLowerCase();
                const expectedKeywords = getExpectedKeywords(documentType);
                const matchesExpected = expectedKeywords.some(kw => topLabel.includes(kw));

                if (!matchesExpected && classification[0].score > 0.5) {
                    results.findings.push({
                        type: 'DOCUMENT_TYPE_MISMATCH',
                        severity: 'high',
                        detail: `Document classified as "${classification[0].label}" (${(classification[0].score * 100).toFixed(1)}% confidence) but expected type is "${documentType}".`
                    });
                    results.overallRiskScore += 25;
                }
            }

            // 3b: OCR Text Extraction
            console.log('🤖 Step 3b: Extracting text from document...');
            const extractedText = await extractTextFromImage(hf, imageBuffer);
            results.aiAnalysis.extractedText = extractedText;

            // 3c: AI Text Fraud Analysis
            if (extractedText && extractedText.length > 10) {
                console.log('🤖 Step 3c: AI fraud analysis on extracted text...');
                const textAnalysis = await analyzeTextForFraud(hf, extractedText, documentType);
                results.aiAnalysis.fraudAnalysis = textAnalysis;
            }

        } catch (error) {
            console.warn('⚠️ Hugging Face API not available:', error.message);
            results.aiAnalysis.note = hfAvailable
                ? 'Some AI analysis features encountered errors. Results are based on image analysis only.'
                : 'Hugging Face API token not configured. Set HUGGINGFACE_API_TOKEN in .env for full AI analysis. Results are based on image metadata and visual analysis only.';
        }

        // ---- Step 4: Calculate Final Risk Score ----
        results.overallRiskScore = Math.min(results.overallRiskScore, 100);

        if (results.overallRiskScore >= 60) {
            results.riskLevel = 'HIGH';
        } else if (results.overallRiskScore >= 30) {
            results.riskLevel = 'MEDIUM';
        } else {
            results.riskLevel = 'LOW';
        }

        // ---- Step 5: Generate Recommendations ----
        results.recommendations = generateRecommendations(results);

        console.log(`✅ Analysis complete. Risk: ${results.riskLevel} (${results.overallRiskScore}/100)`);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('❌ Document analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Error analyzing document',
            error: error.message
        });
    }
});

// ============================================================
// Helper: Get expected keywords for document type matching
// ============================================================
function getExpectedKeywords(documentType) {
    const keywordMap = {
        'passport': ['passport', 'id', 'identity', 'travel'],
        'degree': ['letter', 'form', 'scientific', 'publication'],
        'transcript': ['letter', 'form', 'scientific', 'publication'],
        'visa': ['letter', 'form', 'id', 'identity'],
        'certificate': ['letter', 'form', 'scientific', 'publication'],
        'bank_statement': ['letter', 'form', 'budget', 'financial'],
        'recommendation_letter': ['letter', 'form', 'handwritten', 'memo'],
        'ielts': ['letter', 'form', 'scientific', 'publication'],
        'offer_letter': ['letter', 'form', 'memo', 'email'],
    };
    return keywordMap[documentType] || [];
}

// ============================================================
// Helper: Generate recommendations based on findings
// ============================================================
function generateRecommendations(results) {
    const recommendations = [];

    if (results.riskLevel === 'HIGH') {
        recommendations.push('⚠️ This document shows multiple fraud indicators. Manual verification by an expert is strongly recommended.');
        recommendations.push('🔍 Cross-reference the document details with the issuing institution directly.');
        recommendations.push('📞 Contact the educational institution or issuing authority to verify authenticity.');
    }

    if (results.riskLevel === 'MEDIUM') {
        recommendations.push('⚡ Some suspicious indicators were found. Additional verification is recommended.');
        recommendations.push('🔍 Compare this document with known authentic samples from the same institution.');
    }

    if (results.findings.some(f => f.type === 'LOW_RESOLUTION')) {
        recommendations.push('📸 Request a higher resolution scan of the document for better analysis.');
    }

    if (results.findings.some(f => f.type === 'NOISE_INCONSISTENCY')) {
        recommendations.push('🔬 The document shows signs of digital manipulation. Request the original physical document for inspection.');
    }

    if (results.findings.some(f => f.type === 'DOCUMENT_TYPE_MISMATCH')) {
        recommendations.push('📋 The document does not appear to match the declared document type. Verify the correct document was uploaded.');
    }

    if (results.riskLevel === 'LOW') {
        recommendations.push('✅ No major fraud indicators detected. Standard verification procedures should still be followed.');
    }

    recommendations.push('ℹ️ AI-based fraud detection is a screening tool. Always follow your organization\'s standard verification procedures.');

    return recommendations;
}

// ============================================================
// GET /api/document-fraud/supported-types
// ============================================================
router.get('/supported-types', (req, res) => {
    res.json({
        success: true,
        data: {
            documentTypes: [
                { value: 'passport', label: 'Passport' },
                { value: 'degree', label: 'Degree / Diploma Certificate' },
                { value: 'transcript', label: 'Academic Transcript' },
                { value: 'visa', label: 'Visa Document' },
                { value: 'certificate', label: 'Other Certificate' },
                { value: 'bank_statement', label: 'Bank Statement' },
                { value: 'recommendation_letter', label: 'Recommendation Letter' },
                { value: 'ielts', label: 'IELTS / Language Test Score' },
                { value: 'offer_letter', label: 'University Offer Letter' },
            ],
            supportedFileTypes: ['JPEG', 'PNG', 'WebP', 'TIFF'],
            maxFileSize: '10MB'
        }
    });
});

export default router;
