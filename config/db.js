const mongoose = require('mongoose');

const connectDB = async () => {
    mongoose.set('strictPopulate', false);
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log('Connected to db')
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);  
    }
};

module.exports = connectDB;