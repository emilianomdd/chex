const Campground = require('../models/campground');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const campground = require('../models/campground');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')

module.exports.index = async (req, res) => {
    const campgrounds = await Campground.find();
    res.render('campgrounds/index', { campgrounds })
}

module.exports.renderNewForm = (req, res) => {
    res.render('campgrounds/new');
}

module.exports.showTags = async (req, res,) => {
    const tags = req.query
    const final_tags = tags.membership.tags
    const campground = await Campground.findById(req.params.id).populate({
        path: 'members',
        populate: {
            path: 'member'
        }
    })
    if (!campground) {
        req.flash('error', 'Cannot find that campground!');
        return res.redirect('/camprgounds');
    }
    var members_total = []
    for (let member of campground.members) {
        if (member.tags.some(r => final_tags.includes(r))) {
            members_total.push(member)
        }
    }
    if (members_total.length > 0) {
        req.flash('success', `Showing members with ${final_tags} tags!`)
        res.render('campgrounds/show', { campground, members_total });
    }
    else {
        req.flash('failure', `There are no posts with those tags`)
        res.redirect('/')
    }
}

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

module.exports.showCampground = async (req, res,) => {
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
}

module.exports.renderMeet = async (req, res) => {
    const gem_search = await req.query.city_name;
    const all_gems = await Campground.find({ "name": { $all: [gem_search] } });
    if (all_gems.length == 0) {
        req.flash('error', `${gem_search} not found`)
        res.redirect('/campgrounds')
    }
    else {
        res.render('users/find_users', { gem_search, all_gems })
    }

}

module.exports.renderEditForm = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findById(id)
    if (!campground) {
        req.flash('error', 'Cannot find that space!');
        return res.redirect('/campgrounds');
    }
    res.render('campgrounds/edit', { campground });
}

module.exports.updateCampground = async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
    await campground.save();
    req.flash('success', 'Successfully updated space!');
    res.redirect(`/campgrounds/${campground._id}`)
}

module.exports.deleteCampground = async (req, res) => {
    const { id } = req.params;
    await Campground.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted space')
    res.redirect('/campgrounds');
}


module.exports.RenderConfirmOrder = async (req, res) => {
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