const { placeSchema, reviewSchema } = require('./schemas.js');
const ExpressError = require('./utils/ExpressError');
const Place = require('./models/place');
const Post = require('./models/post')
module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'You must be signed in first!');
        return res.redirect('/login');
    }
    next();
}

module.exports.keepCartConsistent = async (req, res, next) => {
    const { id } = req.params
    const post = await Post.findById(id)
    if (!post) {
        return res.render('posts/no_post.ejs')
    }
    if (!req.session.cart) {
        req.session.cart = []
    }
    else if (req.session.cart.length > 0) {
        if (!post.place.id == req.session.cart[0].place) {

            req.session.cart = []
            next()
        } else {
            next()
        }
    } else {
        next()
    }
}

module.exports.hasCart = async (req, res, next) => {
    if (!req.session.cart) {
        req.session.cart = []
    }
    if (req.session.cart.length == 0) {
        console.log(req.session.cart, "HASCART")
        return res.render('users/cart_no_items.ejs')
    }
    else {
        next()
    }
}

module.exports.validatePlace = (req, res, next) => {
    const { error } = placeSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    } else {
        next();
    }
}

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const place = await Place.findById(id);
    if (!place.author.equals(req.user._id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/places/${id}`);
    }
    next();
}

