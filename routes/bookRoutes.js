const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const fileUpload = require('express-fileupload');
const isAdminAuthenticated = require('../middleware/adminAuth');


router.use(fileUpload());


router.get('/bookManagement',isAdminAuthenticated, bookController.bookManage);


router.get('/bookManagement/add',  bookController.getAddBookForm);


router.post('/bookManagement/add',  bookController.addBook);


router.get('/bookManagement/edit/:id',isAdminAuthenticated, bookController.getEditBookForm);


router.post('/bookManagement/edit/:id', isAdminAuthenticated, bookController.editBook);


router.post('/bookManagement/delete/:id',isAdminAuthenticated, bookController.deleteBook);
router.post('/bookManagement/restore/:id', isAdminAuthenticated, bookController.restoreBook);


router.get('/addCategory', isAdminAuthenticated, bookController.getAddCategory);
router.post('/addCategory', isAdminAuthenticated, bookController.addCategory);


router.get('/manageCategories', isAdminAuthenticated, bookController.manageCategories);




router.post('/manageCategories/add', bookController.addCategory);


router.post('/manageCategories/addBook', bookController.addBookToCategory);

router.post('/editCategory', bookController.editCategory);


router.post('/manageCategories/deleteBook', bookController.deleteBookFromCategory);

router.post('/deleteCategory', bookController.deleteCategory);
router.post('/restoreCategory', bookController.restoreCategory);


router.get('/orders', bookController.listOrders);
router.post('/orders/update-status', bookController.updateOrderStatus);
router.post('/orders/cancel', bookController.cancelOrder);


router.get('/inventory', bookController.listBooks);
router.post('/inventory/update-stock', bookController.updateBookStock);

router.get('/offers', bookController.getOfferManagementPage);


router.get('/sales', bookController.getSalesReport);

// Route for downloading sales report in PDF format
router.get('/sales/download/pdf', bookController.downloadPdfReport);

// Route for downloading sales report in Excel format
router.get('/sales/download/excel', bookController.downloadExcelReport);
router.get('/best', bookController.getBestPage);

router.get('/coupons/create', bookController.getCreateCouponPage);
router.get('/offers/create', bookController.getCreateOfferPage);

// Existing routes for creating offers and coupons
router.post('/offers/create/general', bookController.createGeneralOffer);
router.post('/offers/create/product', bookController.createProductOffer);
router.post('/offers/create/category', bookController.createCategoryOffer);
router.post('/offers/product-coupon', bookController.createProductCoupon);
router.post('/offers/category-coupon', bookController.createCategoryCoupon);
router.post('/offers/delete/:id', bookController.deleteOffer);
router.post('/coupons/delete/:id', bookController.deleteCoupon);
// Route to apply offers to a specific book
router.post('/offers/apply/:bookId', async (req, res, next) => {
    try {
        const updatedBook = await bookController.applyOffers(req.params.bookId);
        res.json(updatedBook); // Respond with the updated book information
    } catch (err) {
        next(err);
    }
});




module.exports = router;
