const express = require('express');
const router = express.Router();
const campgrounds = require('../controllers/campgrounds');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const posts = require('../controllers/posts')

const Campground = require('../models/campground');


router.get('/find-specifics', catchAsync(campgrounds.renderSpecifics))

router.route('/')
    .get(catchAsync(campgrounds.index))
    .post(isLoggedIn, catchAsync(campgrounds.createCampground))

router.get('/find', catchAsync(campgrounds.renderMeet))

router.get('/purchase', isLoggedIn, campgrounds.RenderConfirmOrder)

router.get('/render-pending-posts', catchAsync(campgrounds.renderPending))

router.get('/new', isLoggedIn, campgrounds.renderNewForm)

router.get('/pending/:id', catchAsync(campgrounds.showPendingCampground))

router.route('/approve/:id')
    .put(catchAsync(campgrounds.approveCampground))

router.get('/find_tag/:id', catchAsync(campgrounds.showTags))

router.get('/find_tag_posts/:id', catchAsync(posts.renderTag))

router.route('/:id')
    .get(catchAsync(campgrounds.showCampground))
    .put(isLoggedIn, isAuthor, upload.array('image'), validateCampground, catchAsync(campgrounds.updateCampground))
    .delete(isLoggedIn, isAuthor, catchAsync(campgrounds.deleteCampground));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(campgrounds.renderEditForm))

router.get('/:id/checkout', isLoggedIn, catchAsync(campgrounds.checkout))


module.exports = router;    