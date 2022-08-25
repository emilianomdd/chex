const express = require('express');
const router = express.Router();
const campgrounds = require('../controllers/campgrounds');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');
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
router.get('/show_cart/:id', isLoggedIn, catchAsync(posts.showPost))

router.get('/show_rapid/:id', posts.ShowRapid)

router.post('/ordena_rapida/:id', isLoggedIn, posts.RapidOrder)

router.post('/purchase/:id', isLoggedIn, posts.purchase)

router.post('/rapid_cash/:id', isLoggedIn, posts.RapidCash)

router.post('/rapid_card/:id', isLoggedIn, posts.RapidCard)

router.post('/purchase_efectivo/:id', isLoggedIn, posts.purchaseCash)

router.post('/cancel/:id', isLoggedIn, posts.Delete)

router.get('/purchase', isLoggedIn, posts.RenderConfirmOrder)


router.post('/carrito/:id', isLoggedIn, posts.carrito)



module.exports = router;  