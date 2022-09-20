const express = require('express');
const router = express.Router();
const places = require('../controllers/places');
const catchAsync = require('../utils/catchAsync');
const { isLoggedIn, isAuthor, validatePlace } = require('../middleware');
const multer = require('multer');
const { storage } = require('../cloudinary');
const upload = multer({ storage });
const posts = require('../controllers/posts')

const Place = require('../models/place');


router.get('/find-specifics', catchAsync(places.renderSpecifics))

router.route('/')
    .get(catchAsync(places.index))
    .post(isLoggedIn, catchAsync(places.createplace))

router.get('/find', catchAsync(places.renderMeet))

router.get('/purchase', isLoggedIn, places.RenderConfirmOrder)

router.get('/render-pending-posts', catchAsync(places.renderPending))

router.get('/new', isLoggedIn, places.renderNewForm)

router.get('/pending/:id', catchAsync(places.showPendingplace))

router.route('/approve/:id')
    .put(catchAsync(places.approveplace))

router.get('/find_tag/:id', catchAsync(places.showTags))

router.get('/find_tag_posts/:id', catchAsync(posts.renderTag))

router.route('/:id')
    .get(catchAsync(places.showplace))
    .put(isLoggedIn, isAuthor, upload.array('image'), validatePlace, catchAsync(places.updateplace))
    .delete(isLoggedIn, isAuthor, catchAsync(places.deleteplace));

router.get('/:id/edit', isLoggedIn, isAuthor, catchAsync(places.renderEditForm))

router.get('/:id/checkout', isLoggedIn, catchAsync(places.checkout))


module.exports = router;    