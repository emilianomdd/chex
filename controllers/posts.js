const Campground = require('../models/campground');
const User = require('../models/user');
const campground = require('../models/campground');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Post = require('../models/post');
const Order = require('../models/order');
const Pre_order = require('../models/pre_order');
const Carrito = require('../models/carrito')

module.exports.createPost = async (req, res, next) => {
    try {
        const { id } = req.params
        const post = new Post(req.body.post);
        const user = await User.findById(req.user._id);
        post.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        post.author = req.user._id;
        post.price = parseInt(req.body.post.price)
        user.posts.push(post);
        const campground = await Campground.findById(id)
        campground.posts.push(post)
        post.campground = campground
        await post.save();
        await campground.save();
        await user.save();
        res.redirect('/campgrounds')
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.purchase = async (req, res) => {
    try {
        const day = new Date()
        const { id } = req.params
        const pre_order = await Pre_order.findById(id).populate('posts')
        const post_author = await User.findById(pre_order.posts.author)
        const order = new Order()
        const user = await User.findById(req.user.id).populate('messages')
        order.status = 'En proceso'
        order.letter = pre_order.letter
        order.date = day.getTime()
        order.customer = pre_order.customer
        order.quantity = pre_order.quantity
        order.posts = pre_order.posts
        order.drop_off = pre_order.drop_off
        order.section = pre_order.section
        order.seat = pre_order.seat
        post_author.orders_to_complete.push(order)
        order.price = pre_order.price
        order.campground = pre_order.posts.campground
        order.is_delivered = false
        order.is_paid = false
        order.cash = false
        await Pre_order.findByIdAndDelete(id)
        const campground = await Campground.findById(pre_order.posts.campground)
        campground.orders.push(order)
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        user.orders.push(order)
        var price = (pre_order.price + .3) / (1 - 0.066)
        price = price.toFixed(2)
        order.price_final = price
        var comish = price - order.price
        comish = comish.toFixed(2)
        await user.save()
        await post_author.save()
        await order.save()
        await campground.save()

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            payment_intent_data: {
                application_fee_amount: Math.trunc(100 * comish),
                receipt_email: user.email,
                transfer_data: {
                    destination: post_author.stripe_account
                }

            },
            line_items: [{
                amount: Math.trunc(price * 100),
                name: pre_order.posts.title,
                currency: 'mxn',
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://cargi.herokuapp.com/campgrounds/purchase',
            cancel_url: 'https://cargi.herokuapp.com/campgrounds',
        });
        res.redirect(session.url)
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }

}


module.exports.cancelOrder = async (req, res) => {
    const refund = await stripe.refunds.create({
        payment_intent: 'pi_Aabcxyz01aDfoo',
    });
}

module.exports.renderNew = async (req, res) => {
    try {
        const { id } = req.params
        const campground = await Campground.findById(id)
        res.render('posts/new.ejs', { campground })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.renderTag = async (req, res) => {
    try {
        const final_tags = req.query.membership.tags
        const campground = await Campground.findById(req.params.id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author')
        if (!campground) {
            req.flash('error', 'Cannot find that campground!');
            return res.redirect('/campgrounds');
        }
        var all_posts = []
        for (let member of campground.posts) {
            if (member.tags.some(r => final_tags.includes(r))) {
                all_posts.push(member)
            }
        }
        if (all_posts.length > 0) {
            req.flash('success', `Showing posts with ${final_tags} tags!`)
            res.render('campgrounds/show_posts', { campground, all_posts });
        }
        else {
            req.flash('failure', `There are no members with those tags`)
            res.redirect('/')
        }
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.carrito = async (req, res) => {
    try {
        const { id } = req.params
        const post = await Post.findById(id).populate({
            path: 'campground',
            populate: {
                path: 'posts'
            }
        }).populate('author')
        const pre_order = new Pre_order()
        const user = await User.findById(req.user.id).populate('messages').populate('cart')

        pre_order.customer = user
        pre_order.posts = post
        if (req.body.drop_off != 'N/A') {

            pre_order.drop_off = req.body.drop_off
        }
        if (req.body.section != 'N/A') {

            pre_order.section = req.body.section
        }
        pre_order.letter = req.body.letter
        pre_order.seat = req.body.seat
        pre_order.price = parseInt(req.body.how_many) * post.price
        var price = (pre_order.price + .3) / (1 - 0.59)
        price = price.toFixed(2)
        pre_order.price_final = price
        pre_order.quantity = req.body.how_many
        const cart = user.cart
        cart.pre_orders.push(pre_order)
        await cart.save()
        await user.save()
        await pre_order.save()
        const campground = post.campground
        const all_posts = campground.posts
        res.render('campgrounds/show.ejs', { campground, all_posts })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.renderPost = async (req, res) => {
    try {
        const { id } = req.params
        const campground = await Campground.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');
        const all_posts = campground.posts
        res.render('campgrounds/show_posts.ejs', { campground, all_posts })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.showPost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id).populate("campground");
        const campground = post.campground;
        let productData = {
            section: "",
            drop_off: "",
            seat: "",
            letter: "",
            how_many: "",
        };

        if (req.session?.hasOwnProperty("product")) {
            productData = {

                letter: req.session?.product[id]?.letter || "",
                section: req.session?.product[id]?.section || "",
                drop_off: req.session?.product[id]?.drop_off || "",
                seat: req.session?.product[id]?.seat || "",
                how_many: req.session?.product[id]?.how_many || "",
            };
        }
        res.render("posts/show", { post, campground, product: productData })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
};

module.exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        await Post.findByIdAndDelete(id);
        req.flash('success', 'Successfully deleted post')
        res.redirect('/campgrounds');
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(id, { ...req.body.post });
        const imgs = req.files.map(f => ({ url: f.path, filename: f.filename }));
        post.images.push(...imgs);
        await post.save();
        if (req.body.deleteImages) {
            for (let filename of req.body.deleteImages) {
                await cloudinary.uploader.destroy(filename);
            }
            await post.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
        }
        req.flash('success', 'Successfully updated space!');
        res.redirect(`/posts/${post._id}`)
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}


module.exports.RapidOrder = async (req, res) => {
    try {
        const { id } = req.params
        const post = await Post.findById(id).populate({
            path: 'campground',
            populate: {
                path: 'posts'
            }
        }).populate('author')
        const post_author = await post.author
        const order = new Order()
        order.status = 'En proceso'
        const day = new Date()
        order.date = day.getTime()
        const user = await User.findById(req.user.id).populate('messages').populate('cart')
        order.customer = user
        order.is_paid = false
        order.is_delivered = false
        order.posts = post
        order.letter = req.body.letter
        if (req.body.drop_off != 'N/A') {

            order.drop_off = req.body.drop_off
        }
        if (req.body.section != 'N/A') {

            order.section = req.body.section
        }
        order.seat = req.body.seat
        order.price = parseInt(req.body.how_many) * post.price
        var price = (order.price + .3) / (1 - .059)
        price = price.toFixed(2)
        order.price_final = price
        var transaction_fee = ((order.price + .3) / (1 - .059)) - order.price
        transaction_fee = transaction_fee.toFixed(2)
        order.quantity = req.body.how_many
        order.campground = post.campground
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        user.orders.push(order)
        post_author.orders_to_complete.push(order)

        await post_author.save()
        await user.save()
        await order.save()
        res.render('campgrounds/payment_method', { order, transaction_fee, price })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.RenderConfirmOrder = async (req, res) => {
    try {
        const order = new Order()
        order.status = 'En proceso'
        const day = new Date()
        order.date = day.getTime()
        // const user = await User.findById(req.user.id).populate('messages').populate('orders')
        // find last order here and call it order
        order.is_delivered = false
        await Pre_order.findByIdAndDelete(id)
        const campground = await Campground.findById(order.posts.campground)
        await user.save()
        await order.save()
        const all_posts = campground.posts
        res.render('campgrounds/show.ejs', { campground, all_posts })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.Delete = async (req, res) => {
    try {
        const { id } = req.params
        await Pre_order.findByIdAndDelete(id)
        const user = await User.findById(req.user.id)
        const cart = await Carrito.findById(user.cart).populate({
            path: 'pre_orders',
            populate: {
                path: 'posts'
            }
        })
        const all_posts = cart.pre_orders
        res.render('users/render_cart', { user, all_posts })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.purchaseCash = async (req, res) => {
    try {
        const { id } = req.params
        const pre_order = await Pre_order.findById(id).populate('posts')
        const post_author = await User.findById(pre_order.posts.author)
        const order = new Order()
        order.status = 'En proceso'
        const day = new Date()
        order.date = day.getTime()
        const user = await User.findById(req.user.id).populate('messages')
        user.orders.push(order)
        order.letter = pre_order.letter
        order.customer = pre_order.customer
        order.posts = pre_order.posts
        if (req.body.drop_off != 'N/A') {

            order.drop_off = req.body.drop_off
        }
        if (req.body.section != 'N/A') {

            order.section = req.body.section
        }
        order.seat = pre_order.seat
        post_author.orders_to_complete.push(order)
        order.price = pre_order.price
        var price = (pre_order.price + .3) / (1 - 0.59)
        price = price.toFixed(2)
        order.price_final = price
        order.campground = pre_order.posts.campground
        order.is_delivered = false
        order.is_paid = false
        order.cash = true
        await Pre_order.findByIdAndDelete(id)
        const campground = await Campground.findById(pre_order.posts.campground)
        campground.orders.push(order)
        order.conf_num = Math.floor(1000 + Math.random() * 9000);

        await user.save()
        await post_author.save()
        await order.save()
        await campground.save()
        const cart = await Carrito.findById(user.cart).populate({
            path: 'pre_orders',
            populate: {
                path: 'posts'
            }
        })
        const all_posts = cart.pre_orders
        res.render('users/render_cart', { user, all_posts })
    } catch (e) {
        const user = await User.findById(req.user.id)
        const cart = await Carrito.findById(user.cart).populate({
            path: 'pre_orders',
            populate: {
                path: 'posts'
            }
        })
        const all_posts = cart.pre_orders
        req.flash('Favor de Refrescar Pagine e intentar de nuevo');
        res.redirect('users/render_cart', { user, all_posts });
    }
}




module.exports.RapidCash = async (req, res) => {
    try {
        const { id } = req.params

        const user = await User.findById(req.user.id)
        const order = await Order.findById(id).populate({
            path: 'campground',
            populate: {
                path: 'posts'
            }
        }).populate('posts')
        const campground = order.campground
        campground.orders.push(order)
        const post_author = await User.findById(order.posts.author)
        order.cash = true
        order.is_delivered = false
        await campground.save()
        await post_author.save()
        await user.save()
        await order.save()
        const all_posts = campground.posts
        res.render('campgrounds/show.ejs', { campground, all_posts })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}


module.exports.RapidCard = async (req, res) => {
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('campground').populate('posts')
        const post_author = await User.findById(order.posts.author)
        order.cash = false
        await order.save()
        const user = await User.findById(req.user.id)
        var price = (order.price + 3) / (1 - 0.066)
        price = price.toFixed(2)
        var comish = price - order.price
        comish = comish.toFixed(2)
        order.price_final = price
        await order.save()
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            payment_intent_data: {
                application_fee_amount: Math.trunc(100 * comish),
                receipt_email: user.email,
                transfer_data: {
                    destination: post_author.stripe_account
                }

            },
            line_items: [{
                amount: Math.trunc(price * 100),
                name: order.posts.title,
                currency: 'mxn',
                quantity: 1,
            }],
            mode: 'payment',
            success_url: 'https://cargi.herokuapp.com/campgrounds/purchase',
            cancel_url: 'https://cargi.herokuapp.com/campgrounds',
        });
        res.redirect(session.url)
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}

module.exports.ShowRapid = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id).populate("campground");
        const campground = post.campground;

        let product = {
            section: "",
            drop_off: "",
            seat: "",
            how_many: "",
            letetr: ""
        };
        if (req.session?.hasOwnProperty("product")) {
            product = {
                letter: req.session?.product[id]?.letter || "",
                section: req.session?.product[id]?.section || "",
                drop_off: req.session?.product[id]?.drop_off || "",
                seat: req.session?.product[id]?.seat || "",
                how_many: req.session?.product[id]?.how_many || "",
            };
        }
        res.render("posts/show_rapid", { post, campground, product })
    } catch (e) {
        res.falsh('Refresca la Pagina e Intenta de Nuevo')
        res.render('/campgrounds')
    }
}
