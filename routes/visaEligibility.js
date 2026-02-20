import express from 'express';
import { HfInference } from '@huggingface/inference';

const router = express.Router();

/**
 * Initialize Hugging Face client
 */
const getHfClient = () => {
    const token = process.env.HUGGINGFACE_API_TOKEN;
    if (!token) {
        throw new Error('HUGGINGFACE_API_TOKEN is not set in environment variables');
    }
    return new HfInference(token);
};

// ============================================================
// MAIN ROUTE: POST /api/visa-eligibility/analyze
// ============================================================
router.post('/analyze', async (req, res) => {
    try {
        const { qualification, ielts, ageGap, currentAge, specificCountry } = req.body;

        // Validation
        if (!qualification) {
            return res.status(400).json({
                success: false,
                message: 'Qualification is required for analysis.'
            });
        }

        console.log(`🤖 Analyzing visa eligibility for profile: ${qualification}, IELTS: ${ielts}, Gap: ${ageGap}`);

        const hf = getHfClient();

        // Construct a prompt for the AI to act as a visa counselor
        const instruction = `Analyze this student's profile and recommend which countries are suitable for them to apply for a student visa.

Student Profile:
- **Last Qualification**: ${qualification}
- **IELTS Score / English Proficiency**: ${ielts || 'Not yet taken / No result'}
- **Study Gap**: ${ageGap || 'No study gap'}
- **Current Age**: ${currentAge || 'Not specified'}
${specificCountry ? `- **Interested Country**: ${specificCountry}` : ''}

Please structure your response with:
1. **Overview**: A brief summary of the profile strength.
2. **Top Recommended Countries**: List 2-3 countries that are the best fit, explaining why.
3. **Challenges & Risks**: Any potential hurdles (like long study gaps or specific IELTS requirements).
4. **Conclusion/Next Steps**: What the student should do next.

Use professional markdown formatting. Keep the advice concise but informative. Act as a professional Overseas Education & Visa Consultant expert.`;

        // Call Hugging Face API using Chat Completion
        const result = await hf.chatCompletion({
            model: 'Qwen/Qwen2.5-7B-Instruct',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional Overseas Education & Visa Consultant expert.'
                },
                {
                    role: 'user',
                    content: instruction
                }
            ],
            max_tokens: 800,
            temperature: 0.4,
            top_p: 0.9
        });

        const analysisText = result.choices[0].message.content || 'I apologize, but I am unable to generate an analysis at this moment. Please try again later.';

        res.json({
            success: true,
            data: {
                analysis: analysisText,
                profile: {
                    qualification,
                    ielts,
                    ageGap,
                    currentAge,
                    specificCountry
                },
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Visa eligibility analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during eligibility analysis',
            error: error.message
        });
    }
});

// ============================================================
// GET /api/visa-eligibility/info
// ============================================================
router.get('/info', (req, res) => {
    res.json({
        success: true,
        data: {
            purpose: 'Analyze student profiles for study visa eligibility across various countries.',
            inputsRequired: ['qualification'],
            inputsOptional: ['ielts', 'ageGap', 'currentAge', 'specificCountry'],
            modelUsed: 'Hugging Face Inference (Phi-3 Mini)'
        }
    });
});

export default router;
