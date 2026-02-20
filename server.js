import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import clientRoutes from './routes/clients.js';
import documentFraudRoutes from './routes/documentFraud.js';
import visaEligibilityRoutes from './routes/visaEligibility.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        console.log('📊 Database: overseas_consultancy');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        process.exit(1);
    });

// Routes
app.get('/', (req, res) => {
    res.json({
        message: 'Overseas Study Consultants CRM API',
        version: '1.0.0',
        endpoints: {
            clients: '/api/clients',
            documentFraud: '/api/document-fraud',
            visaEligibility: '/api/visa-eligibility',
            health: '/api/health'
        }
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// API Routes
app.use('/api/clients', clientRoutes);
app.use('/api/document-fraud', documentFraudRoutes);
app.use('/api/visa-eligibility', visaEligibilityRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
});
