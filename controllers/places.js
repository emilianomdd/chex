const Place = require('../models/place');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')

//shows the spaces listed in the platform
module.exports.index = async (req, res) => {
    const places = await Place.find();
    res.render('places/index', { places })
}

//renders the form to create a new place
module.exports.renderNewForm = (req, res) => {
    res.render('places/new');
}



//Function to create a place
module.exports.createplace = async (req, res, next) => {
    const place = new Place(req.body.place);
    const user = await User.findById(req.user._id);
    if (req.body.place.drop_offs != '') {
        place.drop_offs = req.body.place.drop_offs.split(',')
    }
    if (req.body.place.sections != '') {
        place.sections = req.body.place.sections.split(',')
    }
    if (req.body.place.categories != '') {
        place.categories = req.body.place.categories.split(',')
    }
    place.author = req.user._id;
    user.places.push(place);
    user.is_manager = true
    console.log(place)
    await place.save();
    await user.save();
    req.flash('success', 'Successfully made a new place!');
    res.redirect(`/places/${place._id}`)

}


//function that will show the place and it's products
module.exports.showplace = async (req, res,) => {
    try {

        const { id } = req.params
        const place = await Place.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');
        const all_posts = place.posts
        if (!place) {
            req.flash('error', 'Cannot find that place!');
            return res.redirect('/places');
        }
        if (Object.keys(req.query).length != 0) {
            const seat = req.query.seat
            const row = req.query.row
            const section = req.query.section
            res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section })
        } else {
            res.render('places/show.ejs', { place, all_posts })
        }
        res.render('places/show.ejs', { place, all_posts })

    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


//renders the form to edit a place
module.exports.renderEditForm = async (req, res) => {

    try {
        const { id } = req.params;
        const place = await Place.findById(id)
        if (!place) {
            req.flash('error', 'Cannot find that space!');
            return res.redirect('/places');
        }
        res.render('places/edit', { place });
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//uses info from edit form to change the info on the place
module.exports.updateplace = async (req, res) => {
    try {
        const { id } = req.params;
        const place = await Place.findByIdAndUpdate(id, { ...req.body.place });
        await place.save();
        req.flash('success', 'Successfully updated space!');
        res.redirect(`/places/${place._id}`)
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


//deletes the place
module.exports.deleteplace = async (req, res) => {
    try {
        const { id } = req.params;
        await Place.findByIdAndDelete(id);
        req.flash('success', 'Successfully deleted space')
        res.redirect('/places');
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
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
        const place = await Place.findById(order.posts.place).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author')
        await user.save()
        await order.save()
        const all_posts = place.posts
        res.render('places/show.ejs', { place, all_posts })
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

module.exports.renderCategory = async (req, res) => {
    try {
        const { id } = req.params
        const place = await Place.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');

        const all_posts = []
        for (let post of place.posts) {
            if (req.query.category.includes(post.category)) {
                all_posts.push(post)
            }
        }
        if (!place) {
            req.flash('error', 'Cannot find that place!');
            return res.redirect('/places');
        }
        res.render('places/show.ejs', { place, all_posts })

    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

module.exports.renderNumbered = async (req, res) => {
    console.log(req)
    res.render('/places')
}

module.exports.renderCategoryNum = async (req, res) => {
    try {
        console.log(req.query)
        const { id } = req.params
        const place = await Place.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');

        const all_posts = []
        for (let post of place.posts) {
            if (req.query.category.includes(post.category)) {
                all_posts.push(post)
            }
        }
        if (!place) {
            req.flash('error', 'Cannot find that place!');
            return res.redirect('/places');
        }

        const seat = req.query.seat
        const row = req.query.row
        const section = req.query.section
        res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section })

    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


