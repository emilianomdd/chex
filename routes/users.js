const express = require('express');
const router = express.Router();
const passport = require('passport');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const users = require('../controllers/users');
const posts = require('../controllers/posts')

const { isLoggedIn, isAuthor, validatePlace } = require('../middleware');

router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

router.post('register_special', users.register)

router.get('/render_vendor_register/:id', users.RenderVendor)

router.post('/create_store/:id', users.RegisterVendor)

router.get('/render-cart', users.RenderCart)

router.post('/five/:id', users.FiveMin)

router.post('/ready/:id', users.Ready)



router.get('/render-orders-store/:id', users.RenderStoreOrders)

router.get('/render_vendor_section/:id', users.RenderSelect)

router.get('/order/complete/:id', users.RenderSelectConfirm)

router.get('/render_vendor_section_xlx/:id', users.RenderSelectXlx)

router.post('/order/complete/:id', isLoggedIn, users.completeOrder)

router.post('/order/create_invoice', posts.createPDF)

router.post('/order/create_invoice_section', posts.createPDFSection)

router.get('/render_orders', users.RenderMyOrders)

router.route('/login')
    .get(users.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), users.login)

router.get('/logout', users.logout)

router.get('/render_xlx/:id', users.renderReport)


router.post('/order/create_report', posts.createReport)

// router.route('/forgot')
//     .get(users.renderForgot)
//     .post(users.forgot)

// router.route('/reset/:token')
//     .get(users.getToken)
//     .post(users.postToken)


// router.route('/users/reset')
//     .get(users.renderReset)



module.exports = router;