const Place = require('../models/place');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')
const Pre_order = require('../models/pre_order')
const Post = require('../models/post')

//renders payment methods after user clicks Pagar $ in cart
module.exports.renderMethods = async (req, res) => {
    const how_many = req.query.how_many
    const cart = req.session.cart
    var place = await Place.findById(cart[0].posts.place)
    var online_payment = place.online_payments
    var price = 0
    for (let i = 0; i < cart.length; i++) {
        price += cart[i].price
    }
    const all_posts = cart
    res.render('users/payment_method_cart.ejs', { place, all_posts, how_many, cart, price, online_payment })
}

//purchase contents of cart with terminal/cash, cart will be vacated in this function
module.exports.purchase = async (req, res) => {
    console.log('purchase')
    post_author = await User.findById(req.session.cart[0].posts.author)
    if (req.session.cart.length > 1) {
        const order = new Order()
        order.price = 0
        order.cash = true
        const day = new Date()
        order.is_reported = false
        order.date = day.getTime()
        order.is_delivered = false
        order.is_paid = false
        order.email = req.body.email
        order.is_multiple = true
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        order.status = "En Proceso"
        order.email = req.body.email

        //adding each one of the orders in cart to the bulk order
        for (let each_order of req.session.cart) {
            const bulk_order = new Order()
            bulk_order.posts = each_order.posts
            bulk_order.quantity = each_order.quantity
            bulk_order.price = each_order.price
            order.price += bulk_order.price
            order.multiple_orders.push(bulk_order)
            await bulk_order.save()
            order.letter = each_order.letter
            order.drop_off = each_order.drop_off
            order.section = each_order.section
            order.seat = each_order.seat
            await Pre_order.findByIdAndDelete(each_order.id)
        }

        order.tip = parseInt(req.body.tip) * req.body.price / 100
        order.price_final = order.price + order.tip
        order.fee = order.price_final - order.tip - order.price
        post_author.orders_to_complete.push(order)
        //add to orders in session
        if (req.session.orders) {
            req.session.orders.push(order)
        } else {
            req.session.orders = [order]
        }
        await post_author.save()
        await order.save()

    } else {
        //doign a regulatr order so user/admin can see the single item beign ordered
        // and not have to click on order to see contents
        const pre_order = req.session.cart[0]
        const order = new Order()
        order.is_reported = false
        order.status = 'En proceso'
        order.letter = pre_order.letter
        order.date = day.getTime()
        order.customer = pre_order.customer
        order.quantity = pre_order.quantity
        order.posts = pre_order.posts
        order.name = pre_order.posts.title
        order.drop_off = pre_order.drop_off
        order.section = pre_order.section
        order.seat = pre_order.seat
        post_author.orders_to_complete.push(order)
        order.price = pre_order.price
        order.place = pre_order.posts.place
        order.is_delivered = false
        order.is_paid = false
        order.cash = true
        order.letter = pre_order.letter
        order.drop_off = pre_order.drop_off
        order.section = pre_order.section
        order.seat = pre_order.seat
        order.tip = parseInt(req.body.tip) * req.body.price / 100
        order.price_final = order.price + order.tip
        order.fee = order.price_final - order.tip - order.price
        //add to orders in session
        if (req.session.orders) {
            req.session.orders.push(order)
        } else {
            req.session.orders = [order]
        }
        await Pre_order.findByIdAndDelete(id)
        await post_author.save()
        await order.save()
    }
    // const sgMail = require('@sendgrid/mail')
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    // const msg = {
    //     to: 'test@example.com', // Change to your recipient
    //     from: 'test@example.com', // Change to your verified sender
    //     subject: 'Sending with SendGrid is Fun',
    //     text: 'and easy to do anywhere, even with Node.js',
    //     html: '<strong>and easy to do anywhere, even with Node.js</strong>',
    // }
    // sgMail
    //     .send(msg)
    //     .then(() => {
    //         console.log('Email sent')
    //     })
    //     .catch((error) => {
    //         console.error(error)
    //     })
    const orders = req.session.orders
    const order_message = 'true'
    const place = await Place.findById(req.session.cart[0].posts.place)
    console.log(req.session.orders)
    req.session.cart = []
    res.render('users/render_orders', { orders, order_message, place })

}

module.exports.delete = async (req, res) => {
    const { id } = req.params
    for (let i = 0; i < req.session.cart.length; i++) {
        const each = req.session.cart[i]
        if (each._id == id) {
            req.session.cart.splice(i, 1)
            // req.session.cart = req.session.cart.splice(i, 1);
        }
    }

    const pre_order = await Pre_order.findByIdAndDelete(id)
    if (req.session.cart.length > 0) {
        var place = await Place.findById(req.session.cart[0].posts.place)
        var online_payment = place.online_payments
        const cart_message = false
        const delete_message = false
        const all_posts = req.session.cart
        res.render('users/render_cart', { delete_message, cart_message, all_posts, place, online_payment })
    } else {
        req.session.cart = []
        res.render('users/cart_no_items')
    }
}

module.exports.onlinePurchase = async (req, res) => {
    console.log('onlinePurchase')
    try {
        const cart = req.session.cart
        const day = new Date()

        const order = new Order()
        for (let each_order of req.session.cart) {
            const bulk_order = new Order()
            bulk_order.posts = each_order.posts
            bulk_order.quantity = each_order.quantity
            bulk_order.price = each_order.price
            order.price += bulk_order.price
            order.multiple_orders.push(bulk_order)
            await bulk_order.save()
            order.letter = each_order.letter
            order.drop_off = each_order.drop_off
            order.section = each_order.section
            order.seat = each_order.seat
            await Pre_order.findByIdAndDelete(each_order.id)
        }
        order.is_reported = false
        order.is_multiple = true
        order.date = day.getTime()
        order.email = req.body.email
        order.price = req.body.price
        order.tip = parseInt(req.body.tip) * order.price / 100
        order.price_final = (order.price + order.tip + 3) / (1 - 0.036)
        order.fee = (order.price_final * 0.036) + 3
        order.place = cart[0].posts.place
        order.is_delivered = false
        order.is_paid = false
        order.cash = false
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        order.cash = false
        order.email = req.body.email
        const each_item = []
        for (let each_order of order.multiple_orders) {
            const posts = await Post.findById(each_order.posts)
            const item_deets = { 'name': posts.title, 'quantity': each_order.quantity, 'price': posts.price * 100 }
            each_item.push(item_deets)
        }
        var fees = order.price_final - order.price - order.tip
        fees = fees.toFixed(2)
        each_item.push({
            'name': 'fees', 'quantity': 1, 'price': Math.trunc(fees * 100)
        })
        var tip = order.tip
        fees = tip.toFixed(2)
        each_item.push({
            'name': 'Propina', 'quantity': 1, 'price': Math.trunc(tip * 100)
        })
        await order.save()
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: each_item.map(item => {
                return {
                    price_data: {
                        currency: "mxn",
                        product_data: {
                            name: item['name'],
                        },
                        unit_amount: item['price'],
                    },
                    quantity: item['quantity'],
                }
            }),
            mode: 'payment',
            success_url: `https://chex-bf3796efb5a0.herokuapp.com/complete_order_cart/${order.id}`,
            cancel_url: `https://chex-bf3796efb5a0.herokuapp.com/cancel_order/${order.id}`,
        });
        res.redirect(session.url)





    }
    catch (e) {
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }

}

module.exports.renderChangeQnty = async (req, res) => {
    const { id } = req.params
    const pre_order = await Pre_order.findById(id)
    const post = await Post.findById(pre_order.posts)
    res.render('carts/change_qnty', { pre_order, post })
}

module.exports.changeQnty = async (req, res) => {
    const { id } = req.params
    const pre_order = await Pre_order.findById(id).populate('posts')
    pre_order.quantity = parseInt(req.body.how_many)
    pre_order.price = pre_order.quantity * pre_order.posts.price
    await pre_order.save()
    for (let i = 0; i < req.session.cart.length; i++) {
        if (req.session.cart[i]._id == pre_order.id) {
            req.session.cart[i] = pre_order
        }
    }
    if (req.session.cart.length > 0) {
        var place = await Place.findById(req.session.cart[0].posts.place)
        var online_payment = place.online_payments
        const cart_message = false
        const delete_message = false
        const change_message = true
        const all_posts = req.session.cart
        res.render('users/render_cart', { delete_message, cart_message, change_message, all_posts, place, online_payment })
    } else {
        req.session.cart = []
        res.render('users/cart_no_items')
    }
}