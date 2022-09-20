const Place = require('../models/place');
const User = require('../models/user');
const place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Post = require('../models/post');
const Order = require('../models/order');
const Pre_order = require('../models/pre_order');
const Carrito = require('../models/carrito')


//Creates an article in a place
module.exports.createPost = async (req, res, next) => {
    console.log("New")
    console.log(req.body)
    try {
        const { id } = req.params
        const post = new Post(req.body.post);
        const user = await User.findById(req.user._id);
        post.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        post.author = req.user._id;
        post.price = parseInt(req.body.post.price)
        user.posts.push(post);
        const place = await Place.findById(id)
        place.posts.push(post)
        post.place = place
        await post.save();
        await place.save();
        await user.save();
        res.redirect('/places')
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/places')
    }
}

//
module.exports.purchase = async (req, res) => {
    try {
        const day = new Date()
        const { id } = req.params
        const pre_order = await Pre_order.findById(id).populate('posts')
        const pre_orderr = await Pre_order.findById(id).populate('posts')
        const post_author = await User.findById(pre_order.posts.author).populate('posts')
        const order = new Order()
        const user = await User.findById(req.user.id).populate('messages')
        order.status = 'En proceso'
        order.letter = pre_order.letter
        order.date = day.getTime()
        order.customer = pre_order.customer
        order.quantity = pre_order.quantity
        order.posts = pre_order.posts
        order.name = pre_orderr.posts.title
        order.drop_off = pre_order.drop_off
        order.section = pre_order.section
        order.seat = pre_order.seat
        post_author.orders_to_complete.push(order)
        order.price = pre_order.price
        order.place = pre_order.posts.place
        order.is_delivered = false
        order.is_paid = false
        order.cash = false
        await Pre_order.findByIdAndDelete(id)
        const place = await Place.findById(pre_order.posts.place)
        place.orders.push(order)
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
        await place.save()

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
            success_url: 'https://cargi.herokuapp.com/places/purchase',
            cancel_url: 'https://cargi.herokuapp.com/places',
        });
        res.redirect(session.url)
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }

}

//unfinished order cancelation function
module.exports.cancelOrder = async (req, res) => {
    const refund = await stripe.refunds.create({
        payment_intent: 'pi_Aabcxyz01aDfoo',
    });
}

//shows form to create a new article
module.exports.renderNew = async (req, res) => {
    try {
        const { id } = req.params
        const place = await Place.findById(id)
        res.render('posts/new.ejs', { place })
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


//agrefa orden al carrito
module.exports.carrito = async (req, res) => {
    try {
        const { id } = req.params
        const post = await Post.findById(id).populate({
            path: 'place',
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
        const place = post.place
        const all_posts = place.posts
        res.render('places/show.ejs', { place, all_posts })
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//Renders the selected place?
module.exports.renderPost = async (req, res) => {
    try {
        const { id } = req.params
        const place = await Place.findById(id).populate({
            path: 'posts',
            populate: {
                path: 'author'
            }
        }).populate('author');
        const all_posts = place.posts
        res.render('places/show_posts.ejs', { place, all_posts })
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//render show post when user looks to add to cart 
module.exports.showPost = async (req, res) => {
    try {
        if (req.user) {
            const { id } = req.params;
            const post = await Post.findById(id).populate("place");
            const place = post.place;
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
            res.render("posts/show", { post, place, product: productData })
        }
        else {
            const { id } = req.params;
            const post = await Post.findById(id).populate("place");
            const place_id = post.place;
            const place = await Place.findById(place_id.id).populate({
                path: 'posts',
                populate: {
                    path: 'author'
                }
            }).populate('author');
            res.render('users/register_route', { place })
        }
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    };
}
//delete posts
module.exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.find(id)
        console.log(post)
        await Post.findByIdAndDelete(id);
        console.log(post)
        req.flash('success', 'Successfully deleted post')
        res.redirect('/places');
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//update post
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
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//creates order but doesn't show anyewhere until iser specifies ppayment method
module.exports.RapidOrder = async (req, res) => {
    try {

        const { id } = req.params
        const post = await Post.findById(id).populate({
            path: 'place',
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
        order.name = post.title
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
        order.place = post.place
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        user.orders.push(order)
        post_author.orders_to_complete.push(order)

        await post_author.save()
        await user.save()
        await order.save()
        res.render('places/payment_method', { order, transaction_fee, price })
    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//see what this is for?
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
        const place = await Place.findById(order.posts.place)
        await user.save()
        await order.save()
        const all_posts = place.posts
        res.render('places/show.ejs', { place, all_posts })
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//deletes pre order
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
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


module.exports.purchaseCash = async (req, res) => {
    try {
        const { id } = req.params
        const pre_order = await Pre_order.findById(id).populate('posts')
        const see_pre = await Pre_order.findById(id).populate('posts')
        const post_author = await User.findById(pre_order.posts.author)
        const order = new Order()
        order.status = 'En proceso'
        const day = new Date()
        order.date = day.getTime()
        const user = await User.findById(req.user.id).populate('messages')
        order.letter = pre_order.letter
        order.customer = pre_order.customer
        order.posts = pre_order.posts
        order.name = see_pre.posts.title
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
        order.place = pre_order.posts.place
        order.is_delivered = false
        order.is_paid = false
        order.cash = true
        await Pre_order.findByIdAndDelete(id)
        const place = await Place.findById(pre_order.posts.place)
        place.orders.push(order)
        order.conf_num = Math.floor(1000 + Math.random() * 9000);

        await user.save()
        await post_author.save()
        await order.save()
        await place.save()
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



//route used when user decides to do rapid checkout and uses cash
module.exports.RapidCash = async (req, res) => {
    try {
        const { id } = req.params
        const user = await User.findById(req.user.id)
        const order = await Order.findById(id).populate({
            path: 'place',
            populate: {
                path: 'posts'
            }
        }).populate('posts')
        const place = order.place
        place.orders.push(order)
        const post_author = await User.findById(order.posts.author)
        order.cash = true
        order.is_delivered = false
        await place.save()
        await post_author.save()
        await user.save()
        await order.save()
        const all_posts = place.posts
        res.render('places/show.ejs', { place, all_posts })
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//route used when user chooses to pay with card after rapid checkout
module.exports.RapidCard = async (req, res) => {
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('place').populate('posts')
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
            success_url: 'https://cargi.herokuapp.com/places/purchase',
            cancel_url: 'https://cargi.herokuapp.com/places',
        });
        res.redirect(session.url)
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//show  route for when user clicks rapid checkout
module.exports.ShowRapid = async (req, res) => {
    try {
        if (req.user) {
            const { id } = req.params;
            const post = await Post.findById(id).populate("place");
            const place = post.place;

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
            res.render("posts/show_rapid", { post, place, product })
        } else {
            const { id } = req.params;
            const post = await Post.findById(id).populate("place");
            const place_id = post.place;
            const place = await Place.findById(place_id.id).populate({
                path: 'posts',
                populate: {
                    path: 'author'
                }
            }).populate('author');
            res.render('users/register_route', { place })
        }
    } catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//grab the orders and create a pdf invoce with the selected items
module.exports.createPDF = async (res, req) => {
    console.log("hi")
    console.log(req.body, "body")
    console.log(req.query, "query")
    console.log(req.params, "params")
    res.redirect("/places")
}