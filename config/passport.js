const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const bcrypt = require('bcrypt');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        const hashedPassword = await bcrypt.hash('123', 10); // Hashing the password with a salt rounds of 10

        user = new User({
          googleId: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value,
          password: hashedPassword
        });
        await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = passport;
