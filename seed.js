import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './models/Client.js';

dotenv.config();

const seedData = [
    {
        name: "Ahmed Ali",
        country: "United Kingdom",
        category: "Study Visa",
        status: "Pending",
        phone: "+92 300 1234567",
        email: "ahmed.ali@example.com",
        address: "Lahore, Pakistan",
        notes: "Interested in UK universities for Computer Science"
    },
    {
        name: "Sana Khan",
        country: "Canada",
        category: "Work Permit",
        status: "Approved",
        phone: "+92 311 7654321",
        email: "sana.khan@example.com",
        address: "Karachi, Pakistan",
        notes: "Software Engineer, approved for work permit"
    },
    {
        name: "Bilal Sheikh",
        country: "USA",
        category: "Visit Visa",
        status: "Rejected",
        phone: "+92 321 9876543",
        email: "bilal.sheikh@example.com",
        address: "Islamabad, Pakistan",
        notes: "Application rejected due to incomplete documentation"
    },
    {
        name: "Zoya Malik",
        country: "Australia",
        category: "Study Visa",
        status: "Approved",
        phone: "+92 333 4567890",
        email: "zoya.malik@example.com",
        address: "Faisalabad, Pakistan",
        notes: "Approved for MBA program in Melbourne"
    },
    {
        name: "Umar Farooq",
        country: "Germany",
        category: "Work Permit",
        status: "Pending",
        phone: "+92 345 0001112",
        email: "umar.farooq@example.com",
        address: "Multan, Pakistan",
        notes: "Mechanical Engineer, awaiting approval"
    },
    {
        name: "Hira Jamil",
        country: "Turkey",
        category: "Visit Visa",
        status: "Approved",
        phone: "+92 302 2233445",
        email: "hira.jamil@example.com",
        address: "Rawalpindi, Pakistan",
        notes: "Tourist visa approved for 30 days"
    }
];

const seedDatabase = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // Clear existing data
        await Client.deleteMany({});
        console.log('🗑️  Cleared existing clients');

        // Insert seed data
        const clients = await Client.insertMany(seedData);
        console.log(`✨ Successfully seeded ${clients.length} clients`);

        // Display seeded data
        console.log('\n📋 Seeded Clients:');
        clients.forEach((client, index) => {
            console.log(`${index + 1}. ${client.name} - ${client.category} (${client.status})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error.message);
        process.exit(1);
    }
};

seedDatabase();
