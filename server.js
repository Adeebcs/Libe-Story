const express = require('express');
const app = express();
const dotenv = require("dotenv")
dotenv.config();
const session = require('express-session');
const mongoose = require('mongoose');
const path = require('path');
const passport = require('./config/passport');
const userRoute = require('./routes/user');
const adminRoute = require('./routes/admin');
const productRoute = require('./routes/product');
const bookRoutes = require('./routes/bookRoutes'); 
const connectDB = require('./config/db');
const serverError = require('./middleware/serverError'); 
const { env } = require('process');
const flash = require('connect-flash');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());
connectDB();
app.use(passport.initialize());
app.use(passport.session());

app.use('/', userRoute);
app.use('/admin', adminRoute);
app.use('/', productRoute);
app.use('/admin', bookRoutes); 

app.use(serverError);

const port = process.env.PORT;
app.listen(port, () => console.log(`Server running on port ${port}`));