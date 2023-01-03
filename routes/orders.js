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
const orders = require('../controllers/orders')

router.post('/complete_order/:id', orders.completeRapidOrder)

router.get('/complete_order/:id', orders.completeRapidOrder)

module.exports = router;    