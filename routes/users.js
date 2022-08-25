const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const users = require('../controllers/users');
const reviews = require('../controllers/reviews')

const { isLoggedIn, isAuthor, validateCampground } = require('../middleware');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.get('/render_vendor_register/:id', users.RenderVendor)

router.post('/create_store/:id', users.RegisterVendor)

router.get('/render-cart/:id', users.RenderCart)

router.post('/five/:id', users.FiveMin)

router.post('/ready/:id', users.Ready)

router.route('/message/:id')
    .get(users.renderMessage)
    .put(users.renderActiveMessage)
    .post(users.createMessage)

router.get('/show/:id', users.showUser)

router.get('/render-orders-store/:id', users.RenderStoreOrders)

router.get('/render_vendor_section/:id', users.RenderSelect)

router.get('/message-active/:id', users.renderActiveMessageOther)

router.get('/render-messages', users.renderMessages)

router.post('/order/complete/:id', isLoggedIn, users.completeOrder)

router.get('/render_orders/:id', isLoggedIn, users.RenderMyOrders)

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), users.login)

router.get('/logout', users.logout)


router.route('/join/:id')
    .get(users.renderMember)
    .post(users.createMembership)

// router.route('/forgot')
//     .get(users.renderForgot)
//     .post(users.forgot)

// router.route('/reset/:token')
//     .get(users.getToken)
//     .post(users.postToken)

module.exports = router;