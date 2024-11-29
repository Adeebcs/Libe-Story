const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/admin'); // Ensure path is correct

mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000
}).then(() => {
    console.log('Connected to MongoDB');
    hashAdminPasswords();
}).catch(err => {
    console.log('Failed to connect to MongoDB', err);
});

async function hashAdminPasswords() {
    try {
        const admins = await Admin.find({});
        for (let admin of admins) {
            const hashedPassword = await bcrypt.hash(admin.password, 10);
            admin.password = hashedPassword;
            await admin.save();
        }
        console.log('Passwords hashed successfully');
        mongoose.connection.close();
    } catch (error) {
        console.error('Error hashing passwords:', error);
        mongoose.connection.close();
    }
}
