const express = require('express');
const app = express();
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');

// Import routes
const userRoute = require('./routes/user');
const adminRoute = require('./routes/admin');

// Set up view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// Middleware to parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session setup
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000
}).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.log('Failed to connect to MongoDB', err);
});

// Prevent caching
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// Use routes
app.use('/', userRoute);
app.use('/', adminRoute);

const port = 3003;
app.listen(port, () => console.log(`Server running on port ${port}`));
