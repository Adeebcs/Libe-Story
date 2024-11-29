const Book = require('../models/book');
const Order = require('../models/order');
const Coupon = require('../models/coupon');
const Category = require('../models/category');
const sharp = require('sharp');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const htmlPdf = require('html-pdf-chrome');
const ejs = require('ejs');
const Offer = require('../models/offer');


async function processAndSaveImage(file, filename) {
    const imagePath = path.join(__dirname, '../public/uploads', filename);
    await sharp(file.data)
        .resize(400, 400)
        .toFile(imagePath);
    return `/uploads/${filename}`;
}


exports.bookManage = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 10; 
        const skip = (page - 1) * limit; 

        const totalBooks = await Book.countDocuments(); 
        const totalPages = Math.ceil(totalBooks / limit); 

       
        const books = await Book.find()
            .skip(skip)
            .limit(limit);

        res.render('bookManage', {
            books,
            currentPage: page,
            totalPages
        });
    } catch (err) {
        next(err);
    }
};



exports.getAddBookForm = async (req, res) => {
    try {
        const categories = await Category.find({});
        const books = await Book.find({});
        res.render('addBook', { categories, books, errorMessage: null });
    } catch (err) {
        next(err);
    }
};

// Add a new book
exports.addBook = async (req, res) => {
    try {
        const bookId = uuidv4();
        const uploadPath = '/uploads/';
        let image1 = '', image2 = '', image3 = '';
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif'];

        const regularPrice = parseFloat(req.body.regular_price);
        const salePrice = parseFloat(req.body.sale_price);

        if (regularPrice < 0 || salePrice < 0) {
            const categories = await Category.find();
            const books = await Book.find();
            return res.render('addBook', { categories, books, errorMessage: 'Regular price and sale price must be non-negative.' });
        }

        if (req.files) {
            const image1File = req.files.image1;
            const image2File = req.files.image2;
            const image3File = req.files.image3;

            const processImage = async (file) => {
                if (file && allowedImageTypes.includes(file.mimetype)) {
                    const fileName = Date.now() + path.basename(file.name);
                    const outputPath = './public' + uploadPath + fileName;
                    await sharp(file.data)
                        .resize(600, 800)
                        .toFile(outputPath);
                    return uploadPath + fileName;
                } else {
                    throw new Error('Invalid image type.');
                }
            };

            if (image1File) image1 = await processImage(image1File);
            if (image2File) image2 = await processImage(image2File);
            if (image3File) image3 = await processImage(image3File);
        }

        const selectedCategories = req.body['category[]'] || [];
        const selectedRelatedProducts = req.body['related_products[]'] || [];

        const newBook = new Book({
            book_id: bookId,
            name: req.body.name,
            author: req.body.author,
            chapters: req.body.chapters,
            synopsis: req.body.synopsis,
            regular_price: regularPrice,
            sale_price: salePrice,
            image1,
            image2,
            image3,
            discountPercentage: req.body.discountPercentage,
            catdiscountPercentage: req.body.catdiscountPercentage,
            stock: req.body.stock,
            highlights: req.body.highlights ? req.body.highlights.split(',') : [],
            category: selectedCategories,
            related_products: selectedRelatedProducts
        });

        await newBook.save();
        await Category.updateMany(
            { name: { $in: selectedCategories } },
            { $addToSet: { books: newBook._id } }
        );
        res.redirect('/admin/bookManagement');
    } catch (err) {
        console.error(err);
        try {
            const categories = await Category.find();
            const books = await Book.find();
            res.render('addBook', { categories, books, errorMessage: err.message });
        } catch (fetchError) {
            next(fetchError);
        }
    }
};


exports.getEditBookForm = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        const categories = await Category.find();
        const books = await Book.find();

        if (!book) {
            return res.status(404).send('Book not found');
        }

        res.render('editBook', { book, categories, books, errorMessage: null });
    } catch (err) {
        next(err);
    }
};

// Edit  book
exports.editBook = async (req, res) => {
    let book;

    try {
        const bookId = req.params.id;
        book = await Book.findById(bookId);

        if (!book) {
            return res.status(404).send('Book not found');
        }

        const regularPrice = parseFloat(req.body.regular_price);
        const salePrice = parseFloat(req.body.sale_price);

        if (regularPrice < 0 || salePrice < 0) {
            const categories = await Category.find();
            const books = await Book.find();
            return res.render('editBook', { book, categories, books, errorMessage: 'Regular price and sale price must be non-negative.' });
        }

        book.name = req.body.name;
        book.author = req.body.author;
        book.chapters = req.body.chapters;
        book.synopsis = req.body.synopsis;
        book.regular_price = regularPrice;
        book.sale_price = salePrice;
        book.stock = req.body.stock;

        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/gif'];
        const uploadPath = '/uploads/';

        const processImage = async (file) => {
            if (file && allowedImageTypes.includes(file.mimetype)) {
                const fileName = Date.now() + path.basename(file.name);
                const outputPath = './public' + uploadPath + fileName;
                await sharp(file.data)
                    .resize(600, 800)
                    .toFile(outputPath);
                return uploadPath + fileName;
            } else {
                throw new Error('Invalid image type.');
            }
        };

        if (req.files) {
            if (req.files.image1) book.image1 = await processImage(req.files.image1);
            if (req.files.image2) book.image2 = await processImage(req.files.image2);
            if (req.files.image3) book.image3 = await processImage(req.files.image3);
        }

        book.category = req.body['category[]'] || [];
        book.related_products = req.body['related_products[]'] || [];

        await book.save();
        await Category.updateMany(
            { name: { $in: book.category } },
            { $addToSet: { books: book._id } }
        );

        res.redirect('/admin/bookManagement');
    } catch (err) {
        console.error(err);
        const categories = await Category.find();
        const books = await Book.find();
        res.render('editBook', { book, categories, books, errorMessage: err.message });
    }
};

exports.deleteBook = async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { $set: { deleted: true } });
        res.redirect('/admin/bookManagement');
    } catch (err) {
        next(err);
    }
};


exports.restoreBook = async (req, res) => {
    try {
        await Book.findByIdAndUpdate(req.params.id, { $set: { deleted: false } });
        res.redirect('/admin/bookManagement');
    } catch (err) {
        next(err);
    }
};


exports.getAddCategory = (req, res) => {
    res.render('addCategory');
};

exports.postAddCategory = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).send('Category name is required and cannot be just whitespace.');
        }

        const newCategory = new Category({ name });
        await newCategory.save();
        res.redirect('/admin/bookManagement');
    } catch (err) {
        next(err);
    }
};



exports.listOrders = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    try {
        const orders = await Order.find()
            .populate('items.book')
            .populate('user')
            .populate('address')
            .skip(skip)
            .limit(limit);

        const count = await Order.countDocuments();
        const totalPages = Math.ceil(count / limit);

        res.render('orderManagement', { orders, totalPages, currentPage: page });
    } catch (err) {
        next(err);
    }
};


exports.updateOrderStatus = async (req, res, next) => {
    const { orderId, status } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.status = status;
        order.updated_at = new Date();
        await order.save();
        res.redirect('/admin/orders');
    } catch (err) {
        next(err);  // Pass the error to the next middleware (error handler)
    }
};


exports.cancelOrder = async (req, res) => {
    const { orderId } = req.body;
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }
        order.status = 'Cancelled';
        order.updated_at = new Date();
        await order.save();
        res.redirect('/admin/orders');
    } catch (err) {
        next(err);
    }
};



exports.listBooks = async (req, res) => {
    try {
        const books = await Book.find();
        res.render('inventoryManagement', { books });
    } catch (err) {
        next(err);
    }
};


exports.updateBookStock = async (req, res) => {
    const { bookId, newStock } = req.body;
    try {
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).send('Book not found');
        }
        book.stock = newStock;
        await book.save();
        res.redirect('/admin/inventory');
    } catch (err) {
        next(err);
    }
};


exports.editCategory = async (req, res) => {
    try {
        const { categoryId, categoryName } = req.body;


        await Category.findByIdAndUpdate(categoryId, { name: categoryName });


        res.redirect('manageCategories');
    } catch (err) {
        next(err);
    }
};


exports.manageCategories = async (req, res, next) => {
    try {
        const categories = await Category.find();
        const flashMessage = req.flash('flashMessage'); // Assuming you're using connect-flash or similar middleware
        res.render('manageCategories', { categories, flashMessage });
    } catch (err) {
        next(err);
    }
};

exports.getAddCategory = async (req, res, next) => {
    try {
        const categories = await Category.find(); // Fetch categories
        res.render('addCategory', { categories }); // Pass categories to the view
    } catch (err) {
        next(err); // Handle any errors
    }
   
};

exports.addCategory = async (req, res, next) => {
    try {
        let { categoryName } = req.body;

        // Trim and validate
        categoryName = categoryName.trim();

        if (!categoryName || categoryName.length === 0) {
            req.flash('flashMessage', 'Category name is required and cannot be empty or whitespace.');
            return res.redirect('/admin/manageCategories');
        }

        // Save new category
        const newCategory = new Category({ name: categoryName });
        await newCategory.save();

        req.flash('flashMessage', 'Category added successfully.');
        res.redirect('/admin/manageCategories');
    } catch (err) {
        next(err);
    }
};




exports.addBookToCategory = async (req, res) => {
    try {
        console.log('Form Data:', req.body);

        const { categoryId, bookId } = req.body;

        if (!categoryId || !bookId) {
            return res.status(400).send('Category ID and Book ID are required');
        }


        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }


        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).send('Book not found');
        }


        if (!category.books.includes(bookId)) {

            category.books.push(bookId);
            await category.save();
        }

        res.redirect('/admin/manageCategories');
    } catch (err) {
        next(err);
    }
};


exports.deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;


        await Category.findByIdAndUpdate(categoryId, { deleted: true });


        res.redirect('/admin/manageCategories');
    } catch (err) {
        next(err);
    }
};


exports.restoreCategory = async (req, res) => {
    try {
        const { categoryId } = req.body;

        console.log('Restoring category with ID:', categoryId);

        await Category.findByIdAndUpdate(categoryId, { deleted: false });


        res.redirect('/admin/manageCategories');
    } catch (err) {
        next(err);
    }
};


exports.deleteBookFromCategory = async (req, res) => {
    try {
        const { categoryId, bookId } = req.body;

        if (!categoryId || !bookId) {
            return res.status(400).send('Category ID and Book ID are required');
        }


        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).send('Category not found');
        }


        category.books = category.books.filter(b => b.toString() !== bookId.toString());
        await category.save();

        res.redirect('/admin/manageCategories');
    } catch (err) {
        next(err);
    }
};



exports.createProductCoupon = async (req, res, next) => {
    const { code, discountPercentage, validFrom, validUntil, productSpecific } = req.body;
    try {
        const coupon = new Coupon({
            code,
            discountPercentage,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            productSpecific: productSpecific ? [productSpecific] : []
        });
        await coupon.save();
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};

exports.createCategoryCoupon = async (req, res, next) => {
    const { code, discountPercentage, validFrom, validUntil, categorySpecific } = req.body;
    try {
        const coupon = new Coupon({
            code,
            discountPercentage,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            categorySpecific: categorySpecific || []
        });
        await coupon.save();
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};

exports.applyOffers = async (bookId) => {
    try {

        const book = await Book.findById(bookId).populate('category');
        if (!book) {
            throw new Error('Book not found');
        }

        const currentDate = new Date();


        const productOffers = await Offer.find({
            productSpecific: bookId,
            validFrom: { $lte: currentDate },
            validUntil: { $gte: currentDate },
            type: 'product'
        });


        const generalOffers = await Offer.find({
            type: 'general',
            validFrom: { $lte: currentDate },
            validUntil: { $gte: currentDate }
        });


        const categoryNames = book.category;


        const categories = await Category.find({ name: { $in: categoryNames } });
        const categoryIds = categories.map(category => category._id);


        const categoryOffers = await Offer.find({
            categorySpecific: { $in: categoryIds },
            validFrom: { $lte: currentDate },
            validUntil: { $gte: currentDate },
            type: 'category'
        });


        let bestDiscount = 0;


        productOffers.forEach(offer => {
            if (offer.discountPercentage > bestDiscount) {
                bestDiscount = offer.discountPercentage;
            }
        });


        generalOffers.forEach(offer => {
            if (offer.discountPercentage > bestDiscount) {
                bestDiscount = offer.discountPercentage;
            }
        });


        categoryOffers.forEach(offer => {
            if (offer.discountPercentage > bestDiscount) {
                bestDiscount = offer.discountPercentage;
            }
        });


        if (bestDiscount > 0) {

            book.sale_price = book.regular_price - (book.regular_price * (bestDiscount / 100));
        } else {

            book.sale_price = book.regular_price;
        }


        await book.save();


        return book;

    } catch (err) {
        console.error("Error applying offers:", err);
        throw err;
    }
};




exports.getOfferManagementPage = async (req, res, next) => {
    try {
        const products = await Book.find();
        const categories = await Category.find();
        const coupons = await Coupon.find();
        const offers = await Offer.find();
        res.render('offerManagement', { products, categories, coupons, offers });
    } catch (err) {
        next(err);
    }
};


exports.createGeneralOffer = async (req, res, next) => {
    const { discountPercentage, validFrom, validUntil } = req.body;
    try {
        const offer = new Offer({
            discountPercentage,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            type: 'general'
        });
        await offer.save();
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};

exports.createProductOffer = async (req, res, next) => {

    const { productSpecific, discountPercentage, validFrom, validUntil } = req.body;
    try {
        const offer = new Offer({
            productSpecific: [productSpecific],
            discountPercentage,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            type: 'product'
        });
        await offer.save();


        const offers = await Offer.find({});
        const products = await Book.find({});
        const categories = await Category.find({});
        const coupons = await Coupon.find({});
        res.render('offerManagement', { offers, products, categories, coupons });
    } catch (err) {
        console.error(err);
        next(err);
    }
};



exports.createCategoryOffer = async (req, res, next) => {
    console.log("Request received:", req.body);
    const { categorySpecific, discountPercentage, validFrom, validUntil } = req.body;

    try {

        const categories = await Category.find({ _id: { $in: categorySpecific } });


        if (categories.length === 0) {
            return res.status(400).send('No valid categories found');
        }


        const categoryIds = categories.map(category => category._id.toString());


        const offer = new Offer({
            categorySpecific: categoryIds,
            discountPercentage,
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            type: 'category'
        });

        await offer.save();
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};

exports.getCreateCouponPage = async (req, res, next) => {
    try {
        const products = await Book.find();
        const categories = await Category.find();
        res.render('createCoupon', { products, categories });
    } catch (err) {
        next(err);
    }
};

exports.getCreateOfferPage = async (req, res, next) => {
    try {
        const products = await Book.find();
        const categories = await Category.find();
        res.render('createOffer', { products, categories });
    } catch (err) {
        next(err);
    }
};


exports.deleteOffer = async (req, res, next) => {
    try {
        const offerId = req.params.id;
        await Offer.findByIdAndDelete(offerId);
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};

exports.deleteCoupon = async (req, res, next) => {
    try {
        const couponId = req.params.id;
        await Coupon.findByIdAndDelete(couponId);
        res.redirect('/admin/offers');
    } catch (err) {
        next(err);
    }
};



exports.getSalesReport = async (req, res, next) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let query = {};
        const page = parseInt(req.query.page, 10) || 1; 
        const ITEMS_PER_PAGE = 10; 

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      
        if (filter === 'daily') {
            query.created_at = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === 'weekly') {
            query.created_at = { $gte: new Date(today.setDate(today.getDate() - 7)) };
        } else if (filter === 'monthly') {
            query.created_at = { $gte: new Date(today.setMonth(today.getMonth() - 1)) };
        } else if (filter === 'custom' && startDate && endDate) {
            query.created_at = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

      
        const totalItems = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE); 

       
        const orders = await Order.find(query)
            .skip((page - 1) * ITEMS_PER_PAGE)  
            .limit(ITEMS_PER_PAGE)              
            .populate('appliedCoupon')
            .populate('items.book')
            .populate('user')
            .exec();

        let totalAmountSum = 0;
        let totalDiscountSum = 0;

        const salesReport = orders.map(order => {
            const totalAmount = order.items.reduce((sum, item) => sum + (item.book.regular_price * item.quantity), 0);
            const couponDeductions = order.actualTotal - order.totalPrice;
            const totalItemsPurchased = order.items.reduce((sum, item) => sum + item.quantity, 0);

            totalAmountSum += order.totalPrice;
            totalDiscountSum += couponDeductions;

            return {
                date: order.created_at.toDateString(),
                userName: `${order.user.first_name} ${order.user.last_name}`,
                totalItemsPurchased,
                totalAmount: order.totalPrice,
                couponDeductions
            };
        });

        const totalOrdersCount = salesReport.length;

        res.render('sales', {
            salesReport,
            filter,
            totalPages,
            currentPage: page,
            startDate,
            endDate,
            totalOrdersCount,
            totalAmountSum,
            totalDiscountSum
        });
    } catch (err) {
        next(err);
    }
};






exports.downloadPdfReport = async (req, res, next) => {
    try {
        const { filter, startDate, endDate } = req.query;


        let query = {};
        const today = new Date();

        if (filter === 'daily') {
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));
            query.created_at = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === 'weekly') {
            query.created_at = { $gte: new Date(today.setDate(today.getDate() - 7)) };
        } else if (filter === 'monthly') {
            query.created_at = { $gte: new Date(today.setMonth(today.getMonth() - 1)) };
        } else if (filter === 'custom' && startDate && endDate) {
            query.created_at = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }


        const orderData = await Order.find(query)
            .populate('user')
            .populate('items.book')
            .sort({ created_at: -1 });

        const orders = orderData.map(order => {
            const actualTotal = order.items.reduce((sum, item) => sum + (item.book.regular_price * item.quantity), 0);
            const couponDeductions = actualTotal - order.totalPrice;
            const totalItemsPurchased = order.items.reduce((sum, item) => sum + item.quantity, 0);

            return {
                date: new Date(order.created_at).toISOString().split('T')[0],
                customerName: order.user ? `${order.user.first_name} ${order.user.last_name}` : 'N/A',
                totalItemsPurchased,
                actualTotal: actualTotal.toFixed(2),
                totalAmount: order.totalPrice.toFixed(2),
                couponDeductions: couponDeductions.toFixed(2)
            };
        });


        const totalOrdersCount = orders.length;

        // Prepare HTML for PDF
        const html = `
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table, th, td { border: 1px solid black; padding: 10px; }
        th { background-color: #f2f2f2; }
        .totals-row td { font-weight: bold; }
    </style>
</head>
<body>
    <h1>Sales Report</h1>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>User Name</th>
                <th>Total Items Purchased</th>
                <th>Total Amount</th>
                <th>Discount</th>
            </tr>
        </thead>
        <tbody>
            ${orders.map(order => `
                <tr>
                    <td>${order.date}</td>
                    <td>${order.customerName}</td>
                    <td>${order.totalItemsPurchased}</td>
                    <td>$${order.totalAmount}</td>
                    <td>$${order.couponDeductions}</td>
                </tr>
            `).join('')}
            <tr class="totals-row">
                <td colspan="2">Total Orders:</td>
                <td colspan="3">${totalOrdersCount}</td>
            </tr>
            <tr class="totals-row">
                <td colspan="2">Total Amount:</td>
                <td colspan="3">$${orders.reduce((sum, order) => sum + parseFloat(order.totalAmount), 0).toFixed(2)}</td>
            </tr>
            <tr class="totals-row">
                <td colspan="2">Total Discount:</td>
                <td colspan="3">$${orders.reduce((sum, order) => sum + parseFloat(order.couponDeductions), 0).toFixed(2)}</td>
            </tr>
        </tbody>
    </table>
</body>
</html>
`;


        const options = {
            format: 'A4'
        };


        const pdfBuffer = await htmlPdf.create(html, options).then(pdf => pdf.toBuffer());


        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.pdf');
        res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};


exports.downloadExcelReport = async (req, res, next) => {
    try {
        const { filter, startDate, endDate } = req.query;
        let query = {};

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        if (filter === 'daily') {
            query.created_at = { $gte: startOfDay, $lte: endOfDay };
        } else if (filter === 'weekly') {
            query.created_at = { $gte: new Date(today.setDate(today.getDate() - 7)) };
        } else if (filter === 'monthly') {
            query.created_at = { $gte: new Date(today.setMonth(today.getMonth() - 1)) };
        } else if (filter === 'custom' && startDate && endDate) {
            query.created_at = { $gte: new Date(startDate), $lte: new Date(endDate) };
        }

        const orderData = await Order.find(query)
            .populate('user')
            .populate('items.book')
            .sort({ created_at: -1 });

        let totalOrdersCount = 0;
        let totalAmountSum = 0;
        let totalDiscountSum = 0;
        let totalItemsPurchasedSum = 0;
        let totalActualTotalSum = 0;

        
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Date', key: 'date', width: 20 },
            { header: 'User Name', key: 'customerName', width: 30 },
            { header: 'Total Items Purchased', key: 'totalItemsPurchased', width: 20 },
            { header: 'Total Amount', key: 'totalAmount', width: 20 },
            { header: 'Actual Total', key: 'actualTotal', width: 20 },
            { header: 'Coupon Deductions', key: 'couponDeductions', width: 20 },
        ];

    
        orderData.forEach(order => {
            const totalItemsPurchased = order.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAmount = order.totalPrice ? order.totalPrice : 0;
            const actualTotal = order.actualTotal ? order.actualTotal : 0;
            const couponDeductions = actualTotal - totalAmount;

            totalOrdersCount++;
            totalAmountSum += totalAmount;
            totalDiscountSum += couponDeductions;
            totalItemsPurchasedSum += totalItemsPurchased;
            totalActualTotalSum += actualTotal;

            worksheet.addRow({
                date: moment(order.created_at).format('YYYY-MM-DD'),
                customerName: order.user ? `${order.user.first_name} ${order.user.last_name}` : 'N/A',
                totalItemsPurchased,
                totalAmount: totalAmount.toFixed(2),
                actualTotal: actualTotal.toFixed(2),
                couponDeductions: couponDeductions.toFixed(2),
            });
        });

       
        worksheet.addRow({
            date: 'TOTALS',
            customerName: '',
            totalItemsPurchased: totalItemsPurchasedSum.toFixed(0), 
            totalAmount: totalAmountSum.toFixed(2),
            actualTotal: totalActualTotalSum.toFixed(2), 
            couponDeductions: totalDiscountSum.toFixed(2),
        });

        
        worksheet.addRow({
            date: 'TOTAL ORDERS',
            customerName: '',
            totalItemsPurchased: totalOrdersCount,  
            totalAmount: '',
            actualTotal: '',
            couponDeductions: '',
        });

        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Sales_Report.xlsx"');

        
        await workbook.xlsx.write(res); 

        res.end();
    } catch (err) {
        next(err);
    }
};




  

exports.getBestPage = async (req, res, next) => {
    try {

        const bestBooks = await Order.aggregate([
            { $unwind: "$items" },
            { $group: { _id: "$items.book", totalQuantity: { $sum: "$items.quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "books",
                    localField: "_id",
                    foreignField: "_id",
                    as: "book"
                }
            },
            { $unwind: "$book" }
        ]);


        const bestCategories = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "books",
                    localField: "items.book",
                    foreignField: "_id",
                    as: "book"
                }
            },
            { $unwind: "$book" },
            { $unwind: "$book.category" },
            { $group: { _id: "$book.category", totalQuantity: { $sum: "$items.quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "name",
                    as: "category"
                }
            },
            { $unwind: "$category" }
        ]);


        const bestAuthors = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "books",
                    localField: "items.book",
                    foreignField: "_id",
                    as: "book"
                }
            },
            { $unwind: "$book" },
            { $group: { _id: "$book.author", totalQuantity: { $sum: "$items.quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);


        res.render('best', { bestBooks, bestCategories, bestAuthors });
    } catch (error) {
        next(error);
    }
};






