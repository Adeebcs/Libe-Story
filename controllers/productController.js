const Book = require('../models/book');
const User = require('../models/user');
const Coupon = require('../models/coupon');
const Category = require('../models/category');
const Cart = require('../models/cart');
const Wishlist = require('../models/wishlist');
const flash = require('connect-flash');
const { applyOffers } = require('./bookController');
const Offer = require('../models/offer');
const Order = require('../models/order');

exports.bookDetails = async (req, res, next) => {
    try {
        
        const book = await Book.findById(req.params.id)
            .populate('coupon')
            .populate({
                path: 'related_products',
                select: 'name image1 ratings review', 
            });

        if (!book) {
            return res.status(404).send('Book not found');
        }

        
        await applyOffers(book._id);

        
        const updatedBook = await Book.findById(req.params.id)
            .populate('coupon')
            .populate({
                path: 'related_products',
                select: 'name image1 ratings review', 
            });

        
        res.render('bookDetails', { book: updatedBook, errorMsg: '' });
    } catch (err) {
        next(err);
    }
};
exports.addComment = async (req, res, next) => {
    try {
        const bookId = req.params.id;
        const { rating, comment } = req.body;
        if (!req.session.userId) {
            return res.status(401).send('User not authenticated');
        }
        
        
        const user = await User.findById(req.session.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).send('Book not found');
        }

        book.review.push({
            user_id: req.session.userId,
            username: user.username, 
            rating,
            comment,
        });

        
        book.ratings = book.review.reduce((sum, rev) => sum + rev.rating, 0) / book.review.length;

        await book.save();
        res.redirect(`/books/${bookId}`);
    } catch (err) {
        next(err);
    }
};

exports.updateBook = async (req, res, next) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.bookId, req.body, { new: true });
        await applyOffers(book._id); 
        res.redirect('/admin/book/' + book._id);
    } catch (err) {
        next(err);
    }
};




exports.listProducts = async (req, res, next) => {
    try {
        const { sort, category, priceMin, priceMax, q } = req.query; 
        let filter = { deleted: false };
        const categorySelected = category || ''; 

        // Apply search filter
        if (q) {
            filter.name = { $regex: q, $options: 'i' };
        }

        // Apply category filter
        if (category) {
            filter.category = category;
        }

        // Apply price range filter
        if (priceMin && priceMax) {
            filter.regular_price = { $gte: priceMin, $lte: priceMax };
        }

        // Initialize books array
        let books = [];

        // Popularity-based sorting
        if (sort === 'popularity') {
            const bestSellingBooks = await Order.aggregate([
                { $unwind: "$items" }, // Decompose items array
                {
                    $group: {
                        _id: "$items.book",
                        totalQuantity: { $sum: "$items.quantity" }, // Sum quantities sold
                    }
                },
                { $sort: { totalQuantity: -1 } }, // Sort by total quantity sold
                {
                    $lookup: {
                        from: "books", // Join with books collection
                        localField: "_id",
                        foreignField: "_id",
                        as: "book",
                    }
                },
                { $unwind: "$book" }, // Unwind joined books array
                { 
                    $match: { 
                        "book.deleted": false, // Apply book filters
                        ...(filter.name && { "book.name": filter.name }),
                        ...(filter.category && { "book.category": filter.category }),
                        ...(filter.regular_price && { 
                            "book.regular_price": filter.regular_price 
                        })
                    }
                }
            ]);

            // Extract and structure books
            books = bestSellingBooks.map(entry => entry.book);
        } else {
            // Sorting logic for other sorts (price, ratings, etc.)
            let sortOption = {};
            if (sort === 'priceLowToHigh') {
                sortOption.regular_price = 1;
            } else if (sort === 'priceHighToLow') {
                sortOption.regular_price = -1;
            } else if (sort === 'ratings') {
                sortOption.ratings = -1;
            } else if (sort === 'az') {
                sortOption.name = 1;
            } else if (sort === 'za') {
                sortOption.name = -1;
            }

            // Fetch books with normal filters and sorting
            const collationOptions = { locale: 'en', strength: 2 };
            books = await Book.find(filter).sort(sortOption).collation(collationOptions);
        }

        // Fetch categories for filters
        const categories = await Category.find({ deleted: false });

        // Render product list with data
        res.render('productList', { 
            books, 
            categories, 
            categorySelected,  
            sort,              
            q: q || ''         
        });
    } catch (err) {
        next(err);
    }
};




exports.searchProducts = async (req, res, next) => {
    try {
        const { q, category, sort } = req.query;
        let filter = { deleted: false }; 
        const categorySelected = category || ''; 
        let sortOption = {}; 

       
        if (q) {
            filter.name = { $regex: q, $options: 'i' }; 
        }

        if (categorySelected) {
            filter.category = categorySelected;
        }

        
        if (sort === 'priceLowToHigh') {
            sortOption.regular_price = 1;
        } else if (sort === 'priceHighToLow') {
            sortOption.regular_price = -1;
        } else if (sort === 'popularity') {
            sortOption.popularity = -1;
        } else if (sort === 'ratings') {
            sortOption.ratings = -1;
        } else if (sort === 'az') {
            sortOption.name = 1;
        } else if (sort === 'za') {
            sortOption.name = -1;
        }

        const collationOptions = { locale: 'en', strength: 2 }; 

        
        const books = await Book.find(filter).sort(sortOption).collation(collationOptions);

       
        const categories = await Category.find({ deleted: false });

        
        res.render('productList', { 
            books, 
            categories, 
            categorySelected, 
            sort,          
            q                  
        });
    } catch (err) {
        next(err);
    }
};







exports.addToCart = async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], total_price: 0 });
        }
        const book = await Book.findById(bookId);
        if (!book || book.stock <= 0) {
            return res.status(400).send('Book is out of stock');
        }
        const existingItem = cart.items.find(item => item.book.toString() === bookId);
        if (existingItem) {
            if (existingItem.quantity >= book.stock) {
                return res.status(400).send('Not enough stock available');
            }
            existingItem.quantity += 1;
        } else {
            cart.items.push({ book: bookId, quantity: 1 });
        }
        cart.total_price += book.sale_price || book.regular_price; 
        cart.appliedCoupon = req.session.coupon ? req.session.coupon : null; 
        await cart.save();
        res.redirect('/cart');
    } catch (err) {
        next(err);
    }
};


exports.getCart = async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.book');
        if (!cart) {
            return res.render('cart', {
                cart: { items: [] },
                totalPrice: 0,
                totalItems: 0,
                alerts: [] // Always define alerts
            });
        }

        const alerts = []; // Initialize alerts array
        cart.items.forEach(item => {
            if (item.book && item.book.deleted) {
                alerts.push(`The book "${item.book.name}" is no longer available.`);
            }
        });

        const appliedCoupon = req.session.coupon || null;

        const selectedItems = cart.items.filter(item => item.selected);
        const totalPrice = selectedItems.reduce((total, item) => {
            let bookPrice = item.book.sale_price || item.book.regular_price;

            if (appliedCoupon && appliedCoupon.bookId && appliedCoupon.bookId.toString() === item.book._id.toString()) {
                bookPrice -= (bookPrice * appliedCoupon.discount) / 100;
            }

            return total + (item.quantity * bookPrice);
        }, 0);

        const totalItems = selectedItems.reduce((total, item) => total + item.quantity, 0);

        // Pass alerts along with other data to the template
        res.render('cart', {
            cart,
            totalPrice,
            totalItems,
            appliedCoupon,
            alerts
        });
    } catch (err) {
        next(err);
    }
};





exports.updateCartItems = async (req, res, next) => {
    const { itemId, quantity } = req.body;
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(400).send('Cart not found');
        }

        const item = cart.items.id(itemId);
        if (!item) {
            return res.status(404).send('Item not found in cart');
        }

        const book = await Book.findById(item.book);
        if (!book) {
            return res.status(404).send('Book not found');
        }

        
        if (quantity > book.stock) {
            return res.status(400).send(`Not enough stock available. Only ${book.stock} left in stock.`);
        }

        item.quantity = quantity;
        cart.total_price = cart.items.reduce((total, cartItem) => {
            const itemBook = cartItem.book.toString() === book._id.toString() ? book : null;
            const price = itemBook ? itemBook.sale_price || itemBook.regular_price : 0;
            return total + cartItem.quantity * price;
        }, 0);

        await cart.save();
        res.redirect('/cart');
    } catch (err) {
        next(err);
    }
};



exports.proceedToCheckout = async (req, res, next) => {
    const userId = req.session.userId;

    if (!userId) {
        return res.status(401).send('User not authenticated');
    }

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.book');

        if (!cart || cart.items.length === 0) {
            return res.status(400).send('Your cart is empty.');
        }

        for (let item of cart.items) {
           
            if (item.quantity > item.book.stock) {
                return res.status(400).send(`Not enough stock for ${item.book.name}. Only ${item.book.stock} left in stock.`);
            }

 
            if (item.book.deleted) {
                return res.status(400).send(`The book "${item.book.name}" is no longer available.`);
            }
        }

        res.redirect('/checkout'); 
    } catch (err) {
        next(err);
    }
};




exports.removeCartItems = async (req, res, next) => {
    const { itemId } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(400).send('Cart not found');
        }
        const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
        if (itemIndex === -1) {
            return res.status(404).send('Item not found in cart');
        }
        cart.items.splice(itemIndex, 1);
        const totalPrice = cart.items.reduce((total, item) => {
            const bookPrice = item.book.regular_price || 0;
            const quantity = item.quantity || 0;
            return total + (quantity * bookPrice);
        }, 0);
        cart.total_price = Number(totalPrice.toFixed(2));
        await cart.save();
        res.redirect('/cart');
    } catch (err) {
        next(err);
    }
};


exports.addToWishlist = async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            wishlist = new Wishlist({ user: userId, books: [] });
        }
        const existingBook = wishlist.books.find(book => book.toString() === bookId);
        if (!existingBook) {
            wishlist.books.push(bookId);
        }
        await wishlist.save();
        res.redirect('/wishlist');
    } catch (err) {
        next(err);
    }
};


exports.getWishlist = async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        const wishlist = await Wishlist.findOne({ user: userId }).populate('books');
        res.render('wishlist', { wishlist });
    } catch (err) {
        next(err);
    }
};


exports.removeFromWishlist = async (req, res, next) => {
    const { bookId } = req.body;
    const userId = req.session.userId;
    if (!userId) {
        return res.status(401).send('User not authenticated');
    }
    try {
        let wishlist = await Wishlist.findOne({ user: userId });
        if (!wishlist) {
            return res.status(400).send('Wishlist not found');
        }
        const index = wishlist.books.indexOf(bookId);
        if (index !== -1) {
            wishlist.books.splice(index, 1);
            await wishlist.save();
        }
        res.redirect('/wishlist');
    } catch (err) {
        next(err);
    }
};

exports.getOffers = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().populate('productSpecific').populate('categorySpecific');
        res.render('offers', { coupons });
    } catch (err) {
        next(err);
    }
};

exports.applyCoupon = async (req, res, next) => {
    const { couponCode } = req.body;
    const bookId = req.params.id;

    try {
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).send('Book not found');
        }

        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.render('bookDetails', { book, errorMsg: 'Invalid or inactive coupon code.' });
        }

        const currentDate = new Date();
        if (coupon.validFrom > currentDate || coupon.validUntil < currentDate) {
            return res.render('bookDetails', { book, errorMsg: 'Coupon is expired or not yet valid.' });
        }

        const categories = await Category.find({ name: { $in: book.category } });
        const categoryIds = categories.map(category => category._id.toString());

        const isBookApplicable = coupon.productSpecific.includes(book._id);
        const isCategoryApplicable = coupon.categorySpecific.some(categoryId => 
            categoryIds.includes(categoryId.toString())
        );

        if (!isBookApplicable && !isCategoryApplicable) {
            return res.render('bookDetails', { book, errorMsg: 'This coupon is not applicable to this book.' });
        }

        const discountedPrice = book.regular_price - (book.regular_price * (coupon.discountPercentage / 100));
        book.sale_price = discountedPrice;
        await book.save();

        res.render('bookDetails', { book, discountedPrice, errorMsg: '' });
    } catch (err) {
        next(err);
    }
};

exports.createOrder = async (req, res, next) => {
    const userId = req.session.userId;
    const { address, phone } = req.body;

    try {
        const cart = await Cart.findOne({ user: userId }).populate('items.book');

        let actualTotal = 0;
        let totalPrice = 0;

        for (const item of cart.items) {
            const bookPrice = item.book.sale_price || item.book.regular_price;
            actualTotal += (item.quantity * item.book.regular_price);
            totalPrice += (item.quantity * bookPrice);
        }

        const order = new Order({
            user: userId,
            items: cart.items,
            address: address,
            phone: phone,
            totalPrice: totalPrice,
            actualTotal: actualTotal,
            status: 'Pending Payment',  
            appliedCoupon: req.session.coupon ? req.session.coupon._id : null
        });

        await order.save();
        await Cart.deleteOne({ user: userId });

        res.redirect('/orders');
    } catch (err) {
        next(err);
    }
};
