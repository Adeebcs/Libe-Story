const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Otp = require('../models/otp');
const nodemailer = require('nodemailer');
const WalletHistory = require('../models/walletHistory');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'figmaacc50@gmail.com',
        pass: 'mthq poob hxtc ujdd',
    },
});


function generateOtpCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}


exports.showSignupPage = (req, res) => {
    res.render('signup', { message: "" });
};
const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};


exports.registerUser = async (req, res, next) => {
    const { first_name, last_name, username, email, password, confirm_password, referralCode } = req.body;

   
    if (password !== confirm_password) {
        return res.render('signup', { message: "Passwords do not match" });
    }

   
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
        return res.render('signup', { message: "Email or Username is already registered" });
    }

    const otpCode = generateOtpCode();

    try {
        
        await Otp.create({ email, otp: otpCode });

        
        const mailOptions = {
            from: 'figmaacc50@gmail.com',
            to: email,
            subject: 'Your OTP Code',
            text: `Your OTP code is ${otpCode}. It is valid for 1 minute.`,
        };

        transporter.sendMail(mailOptions, async (error) => {
            if (error) {
                return res.status(500).json({ message: 'Failed to send OTP' });
            } else {
               
                if (referralCode) {
                    const referrer = await User.findOne({ referralCode });
                    if (referrer) {
                        referrer.wallet += 50;
                        await referrer.save();

                       
                        await WalletHistory.create({
                            user: referrer._id,
                            transactionType: 'Referral Bonus',
                            amount: 50
                        });
                    }
                }

              
                req.session.userData = {
                    firstName: first_name,
                    lastName: last_name,
                    username: username,
                    email: email,
                    password: password,
                    referralCode: generateReferralCode() 
                };

               
                return res.status(200).render('otpverification', { message: '' });
            }
        });
    } catch (err) {
        next(err);
    }
};



exports.verifyOtp = async (req, res, next) => {
    const { email } = req.session.userData;
    const otp = req.body.otp1 + req.body.otp2 + req.body.otp3 + req.body.otp4 + req.body.otp5 + req.body.otp6;

    try {
        
        const validOtp = await Otp.findOne({ email, otp: otp.toString() });

        if (validOtp) {
            
            await Otp.deleteOne({ email, otp });

           
            const hashedPassword = await bcrypt.hash(req.session.userData.password, 12);

            
            const newUser = new User({
                firstName: req.session.userData.firstName,
                lastName: req.session.userData.lastName,
                username: req.session.userData.username,
                email: req.session.userData.email,
                password: hashedPassword,
                referralCode: req.session.userData.referralCode
            });

            await newUser.save();

   
            req.session.userId = newUser._id;
            delete req.session.userData;

         
            return res.status(200).redirect('/home');
        } else {
         
            return res.status(400).render('otpverification', { message: 'Invalid OTP. Please try again.' });
        }
    } catch (err) {
        next(err);
    }
};


exports.resendOtp = async (req, res) => {
    const { email } = req.session.userData;
    const otpCode = generateOtpCode();

    try {
        await Otp.deleteMany({ email });

        await Otp.create({ email, otp: otpCode });

        const mailOptions = {
            from: 'figmaacc50@gmail.com',
            to: email,
            subject: 'Your New OTP Code',
            text: `Your new OTP code is ${otpCode}. It is valid for 1 minute.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(500).json({ message: 'Failed to resend OTP' });
            } else {
                return res.render('otpverification', { message: 'New OTP sent. Please check your email.' });
            }
        });
    } catch (err) {
        next(err);
    }
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

    try {
        const foundUser = await User.findOne({
            $or: [{ email: username }, { username: username }]
        });

        if (foundUser) {
            if (foundUser.blocked) {
                return res.render('login', { msg: "Your account is blocked. Please contact support." });
            }
            if (foundUser.deleted) {
                return res.render('login', { msg: "Your account is no longer active." });
            }

            const isMatch = await bcrypt.compare(password, foundUser.password);

            if (isMatch) {
                req.session.userId = foundUser._id;
                foundUser.sessionId = req.sessionID;
                await foundUser.save();

                return res.redirect('/home');
            }
        }

        req.session.passwordwrong = true;
        res.redirect('/');
    } catch (err) {
        next(err);
    }
};

exports.showForgotPasswordPage = (req, res) => {
    res.render('forgotPassword', { message: '' });
};


exports.forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        return res.render('forgotPassword', { message: 'Email is not registered.' });
    }

    const otpCode = generateOtpCode();
    try {
        await Otp.create({ email, otp: otpCode });

        const mailOptions = {
            from: 'figmaacc50@gmail.com',
            to: email,
            subject: 'Password Reset OTP',
            text: `Your OTP code is ${otpCode}. It is valid for 1 minute.`,
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) {
                return res.status(500).json({ message: 'Failed to send OTP' });
            } else {
                req.session.resetEmail = email;
                return res.status(200).render('enterOtp', { message: '' });
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.verifyPasswordOtp = async (req, res, next) => {
    const { otp } = req.body;
    const email = req.session.resetEmail;

    const validOtp = await Otp.findOne({ email, otp: otp.toString() });

    if (validOtp) {
        await Otp.deleteOne({ email, otp });
        return res.status(200).render('resetPassword', { message: '' });
    } else {
        return res.status(400).render('enterOtp', { message: 'Invalid OTP. Please try again.' });
    }
};


exports.resetPassword = async (req, res, next) => {
    const { password, confirmPassword } = req.body;
    const email = req.session.resetEmail;

    if (password !== confirmPassword) {
        return res.render('resetPassword', { message: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    try {
        await User.updateOne({ email }, { password: hashedPassword });
        req.session.resetEmail = null;  
        return res.status(200).redirect('/?accountCreated=true');
    } catch (err) {
        next(err);
    }
};
