const mongoose = require('mongoose');

const connectDB = async () => {
    mongoose.set('strictPopulate', false);
    try {
        await mongoose.connect('mongodb://localhost:27017/userDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB', err);
        process.exit(1);  
    }
};

module.exports = connectDB;