import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    country: {
        type: String,
        required: [true, 'Country is required'],
        trim: true
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Study Visa', 'Work Permit', 'Visit Visa', 'Residency'],
        trim: true
    },
    status: {
        type: String,
        required: [true, 'Status is required'],
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    address: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Client = mongoose.model('Client', clientSchema);

export default Client;
