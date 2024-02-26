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
    if (req.body.online_payments == 'si') {
        place.online_payments = true
    }
    else {
        place.online_payments = false
    }
    const user = await User.findById(req.user._id);
    if (req.body.place.drop_offs != '') {
        place.drop_offs = req.body.place.drop_offs.split(',')
    }
    if (req.body.place.sections != '') {
        place.sections = req.body.place.sections.split(',')
    }

    place.author = req.user._id;
    user.places.push(place);
    user.is_manager = true
    await place.save();
    await user.save();
    req.flash('success', 'Successfully made a new place!');
    res.redirect(`/places/${place._id}`)

}


//function that will show the place and it's products
// module.exports.showplace = async (req, res,) => {
//     try {
//         const user = req.user
//         const { id } = req.params
//         const place = await Place.findById(id).populate({
//             path: 'posts',
//             populate: {
//                 path: 'author'
//             }
//         }).populate('author');
//         req.session.place = place
//         const all_posts = place.posts
//         console.log(all_posts)
//         if (!place) {
//             req.flash('error', 'Cannot find that place!');
//             return res.redirect('/places');
//         }
//         if (Object.keys(req.query).length != 0) {
//             req.session.seat = req.query.seat
//             req.session.row = req.query.row
//             req.session.section = req.query.section
//             const seat = req.query.seat
//             const row = req.query.row
//             const section = req.query.section
//             res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section, user })
//         } else if (req.session.seat && req.session.row && req.session.section) {
//             const seat = req.session.seat
//             const row = req.session.row
//             const section = req.session.section
//             res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section, user })
//         } else {

//             req.flash('error', 'Escanea el codigo QR!');
//             return res.redirect('/places');
//         }

//     } catch (e) {
//         res.falsh('Refresca la Pagina e Intenta de Nuevo')
//         res.render('/places')
//     }
// }

module.exports.showplace = async (req, res) => {
    try {
        const { id } = req.params;
        const place = await Place.findById(id)
            .populate({
                path: 'posts',
                populate: {
                    path: 'author images', // Assuming each post has an 'images' array
                },
            })
            .populate('author'); // Populate the author of the place for additional details

        if (!place) {
            req.flash('error', 'Cannot find that place!');
            return res.redirect('/places');
        }

        // Organize posts by category for display in the EJS template
        const categorizedPosts = {};
        place.posts.forEach(post => {
            const category = post.category; // Assuming each post has a 'category' field
            if (!categorizedPosts[category]) {
                categorizedPosts[category] = [];
            }
            categorizedPosts[category].push(post);
        });
        const all_posts = place.posts
        // Check if query params or session data for seat, row, and section exist
        let seat, row, section;
        if (Object.keys(req.query).length !== 0) {
            seat = req.query.seat;
            row = req.query.row;
            section = req.query.section;
            // Update session with query params
            req.session.seat = seat;
            req.session.row = row;
            req.session.section = section;
        } else if (req.session.seat && req.session.row && req.session.section) {
            // Use existing session data if available
            seat = req.session.seat;
            row = req.session.row;
            section = req.session.section;
        } else {
            // Prompt for necessary information if not available
            req.flash('error', 'Please scan the QR code!');
            return res.redirect('/places');
        }

        // Render the specified EJS template with the place, posts organized by category, and any session-specific data
        res.render('places/show_numbered', { // Corrected template path
            place,
            categorizedPosts,
            seat,
            row,
            section,
            all_posts,
            user: req.user, // Include user data for access control and personalization
        });
    } catch (e) {
        console.error(e); // Improved error logging
        req.flash('error', 'Refresh the page and try again');
        return res.redirect('/places');
    }
};




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
        cosnole.log(e)
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
        if (all_posts.length == 0) {
            res.flash('No hay articulos bajo esta categoria')
            res.render('places/show.ejs', { place, all_posts })
        }
        router.get('/render-orders-store/:id', users.RenderStoreOrders)

    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

module.exports.renderNumbered = async (req, res) => {
    res.render('/places')
}

module.exports.renderCategoryNum = async (req, res) => {
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
            return res.redirect('/places');
        }

        const seat = req.query.seat
        const row = req.query.row
        const section = req.query.section
        res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section })

    } catch (e) {
        res.redirect('/places')
    }
}


