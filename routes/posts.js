const express = require('express');
const router = express.Router();
const places = require('../controllers/places');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validatePlace } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const users = require('../controllers/users')
const posts = require('../controllers/posts')

router.get('/new/:id', catchAsync(posts.renderNew))
router.route('/:id')
    .post(upload.array('image'), catchAsync(posts.createPost))
    .get(catchAsync(posts.renderPost))
    .delete(catchAsync(posts.deletePost))
    .put(catchAsync(posts.updatePost))
router.get('/show_cart/:id', catchAsync(posts.showPost))

router.get('/show_rapid/:id', posts.ShowRapid)

router.get('/show_cart_numbered/:id', catchAsync(posts.showPostNum))

router.get('/show_rapid_numbered/:id', posts.ShowRapidNum)

router.post('/ordena_rapida/:id', posts.RapidOrder)

router.post('/purchase/:id', posts.purchase)

router.post('/rapid_cash/:id', posts.RapidCash)

router.post('/rapid_card/:id', posts.RapidCard)

router.post('/purchase_efectivo/:id', posts.purchaseCash)

router.post('/cancel/:id', posts.Delete)

router.get('/purchase', posts.RenderConfirmOrder)

router.post('/carrito_ordena/:id', posts.carritoOrdena)

router.post('/cart_numbered/:id', posts.carrito)


router.route('/create_invoice')
    .post(posts.createPDF)

module.exports = router;  