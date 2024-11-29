const bcrypt = require('bcryptjs');
const User = require('../models/user');

exports.showSignupPage = (req, res) => {
    res.render('signup');
};

exports.registerUser = async (req, res) => {
    const { first_name, last_name, username, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
        return res.render('signup', { msg: "Passwords do not match" });
    }

    // Check if email or username is already registered
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return res.render('signup', { msg: "Email or Username is already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const newUser = new User({
        firstName: first_name,
        lastName: last_name,
        username: username,
        email: email,
        password: hashedPassword
    });

    await newUser.save();

    // Redirect to login page
    res.redirect('/?accountCreated=true');
};

exports.showLoginPage = (req, res) => {
    const { accountCreated } = req.query;
    let msg = "";

    if (req.session.passwordwrong) {
        msg = "Incorrect username or password";
        req.session.passwordwrong = false;
    } else if (accountCreated) {
        msg = "Account created successfully. Please login.";
    }

    res.render('login', { msg: msg });
};

exports.verifyUser = async (req, res) => {
    const { username, password } = req.body;

    const foundUser = await User.findOne({
        $or: [{ email: username }, { username: username }]
    });

    if (foundUser && await bcrypt.compare(password, foundUser.password)) {
        req.session.user = foundUser.username;
        res.redirect('/home');
    } else {
        req.session.passwordwrong = true;
        res.redirect('/');
    }
};
