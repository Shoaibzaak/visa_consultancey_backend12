import express from 'express';
import Client from '../models/Client.js';

const router = express.Router();

// GET all clients
router.get('/', async (req, res) => {
    try {
        const clients = await Client.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: clients.length,
            data: clients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching clients',
            error: error.message
        });
    }
});

// GET single client by ID
router.get('/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            data: client
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching client',
            error: error.message
        });
    }
});

// CREATE new client
router.post('/', async (req, res) => {
    try {
        const client = new Client(req.body);
        const savedClient = await client.save();

        res.status(201).json({
            success: true,
            message: 'Client created successfully',
            data: savedClient
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error creating client',
            error: error.message
        });
    }
});

// UPDATE client by ID
router.put('/:id', async (req, res) => {
    try {
        const client = await Client.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true, // Return the updated document
                runValidators: true // Run schema validators
            }
        );

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            message: 'Client updated successfully',
            data: client
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: Object.values(error.errors).map(err => err.message)
            });
        }

        res.status(500).json({
            success: false,
            message: 'Error updating client',
            error: error.message
        });
    }
});

// DELETE client by ID
router.delete('/:id', async (req, res) => {
    try {
        const client = await Client.findByIdAndDelete(req.params.id);

        if (!client) {
            return res.status(404).json({
                success: false,
                message: 'Client not found'
            });
        }

        res.json({
            success: true,
            message: 'Client deleted successfully',
            data: client
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting client',
            error: error.message
        });
    }
});

// GET clients by status
router.get('/status/:status', async (req, res) => {
    try {
        const clients = await Client.find({ status: req.params.status }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: clients.length,
            data: clients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching clients by status',
            error: error.message
        });
    }
});

// GET clients by category
router.get('/category/:category', async (req, res) => {
    try {
        const clients = await Client.find({ category: req.params.category }).sort({ createdAt: -1 });

        res.json({
            success: true,
            count: clients.length,
            data: clients
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching clients by category',
            error: error.message
        });
    }
});

export default router;
