const express = require('express');
const router = express.Router();
const places = require('../controllers/places');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validatePlace, hasCart, keepCartConsistent } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const posts = require('../controllers/posts')

const Place = require('../models/place');
const cart = require('../controllers/carts')

router.get('/payment_methods', hasCart, cart.renderMethods)

router.put('/:id', cart.changeQnty)

router.get('/delete/:id', cart.delete)

router.get('/online_purchase', cart.onlinePurchase)

router.post('/online_purchase', cart.onlinePurchase)

router.post('/purchase', hasCart, cart.purchase)

router.get('/change_qnty/:id', cart.renderChangeQnty)

module.exports = router;    