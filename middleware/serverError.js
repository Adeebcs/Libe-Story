const serverError = (err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Internal Server Error');
};

module.exports = serverError;