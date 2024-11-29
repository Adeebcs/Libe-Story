const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const isAuthenticated = require('../middleware/auth');

// list all products
router.get('/products', isAuthenticated, productController.listProducts);

//  search products
router.get('/search', isAuthenticated, productController.searchProducts);


// show details product
router.get('/product/:id', isAuthenticated, productController.bookDetails);
router.get('/book/:id', isAuthenticated, productController.bookDetails);

// comment to a book
router.post('/books/:id/comment', isAuthenticated, productController.addComment);
router.get('/books/:id', isAuthenticated, productController.bookDetails);


router.get('/cart', isAuthenticated, productController.getCart);
router.post('/cart/add', isAuthenticated, productController.addToCart);
router.post('/cart/update', productController.updateCartItems);
router.post('/cart/remove', productController.removeCartItems);
router.get('/wishlist', isAuthenticated, productController.getWishlist);
router.post('/wishlist/add', isAuthenticated, productController.addToWishlist);
router.post('/removeFromWishlist', isAuthenticated, productController.removeFromWishlist);
router.get('/offers', isAuthenticated, productController.getOffers);
router.post('/books/:id/apply-coupon', productController.applyCoupon);
router.get('/cart/proceed-to-checkout', productController.proceedToCheckout);

module.exports = router;
