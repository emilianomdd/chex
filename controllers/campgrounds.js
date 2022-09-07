const Campground = require('../models/campground');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const campground = require('../models/campground');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')

//shows the spaces listed in the platform
module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find();
    res.render('campgrounds/index', { campgrounds })
}

//renders the form to create a new place
module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}



//Function to create a place
module.exports.createCampground = async (req, res, next) => {
    const campground = new Campground(req.body.campground);
    const user = await User.findById(req.user._id);
    if (req.body.campground.drop_offs != '') {
        campground.drop_offs = req.body.campground.drop_offs.split(',')
    }
    if (req.body.campground.sections != '') {
        campground.sections = req.body.campground.sections.split(',')
    }
    campground.author = req.user._id;
    user.campgrounds.push(campground);
    user.is_admin = true
    await campground.save();
    await user.save();
    req.flash('success', 'Successfully made a new campground!');
    res.redirect(`/campgrounds/${campground._id}`)
}


//function that will show the place and it's products
module.exports.showCampground = async (req, res,) => {
    try {
        const { id } = req.params
        const campground = await Campground.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');
        const all_posts = campground.posts
        if (!campground) {
            req.flash('error', 'Cannot find that campground!');
            return res.redirect('/campgrounds');
        }
        res.render('campgrounds/show.ejs', { campground, all_posts })

    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}


//renders the form to edit a place
module.exports.renderEditForm = async (req, res) => {

    try {
        const { id } = req.params;
        const campground = await Campground.findById(id)
        if (!campground) {
            req.flash('error', 'Cannot find that space!');
            return res.redirect('/campgrounds');
        }
        res.render('campgrounds/edit', { campground });
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

//uses info from edit form to change the info on the place
module.exports.updateCampground = async (req, res) => {
    try {
        const { id } = req.params;
        const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
        await campground.save();
        req.flash('success', 'Successfully updated space!');
        res.redirect(`/campgrounds/${campground._id}`)
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}


//deletes the place
module.exports.deleteCampground = async (req, res) => {
    try {
        const { id } = req.params;
        await Campground.findByIdAndDelete(id);
        req.flash('success', 'Successfully deleted space')
        res.redirect('/campgrounds');
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

//I think this is what confirms that a cash order has been paid must check
module.exports.RenderConfirmOrder = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('messages').populate({
            path: 'orders',
            populate: {
                path: 'posts'
            }
        })
        const order = user.orders[user.orders.length - 1]
        order.is_paid = true
        const campground = await Campground.findById(order.posts.campground).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author')
        await user.save()
        await order.save()
        const all_posts = campground.posts
        res.render('campgrounds/show.ejs', { campground, all_posts })
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
} 