const User = require('../models/user');
const Place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')
const Carrito = require('../models/carrito');
const { UserBindingPage } = require('twilio/lib/rest/chat/v2/service/user/userBinding');
const accountSid = process.env.TW_ID;
const authToken = process.env.TW_AUTH;
const client = require('twilio')(accountSid, authToken);
const Post = require('../models/post');
const { ModelBuildPage } = require('twilio/lib/rest/autopilot/v1/assistant/modelBuild');
// const async = require("async")
// const nodemailer = require('nodemailer')
// const crypto = require('crypto')

module.exports.renderRegister = (req, res) => {
    res.render('users/register');
}

module.exports.register = async (req, res, next) => {
    try {
        const { email, username, password, phone, countryCode } = req.body;
        const cart = new Carrito()
        const user = new User({ email, username });
        const final_phone = (countryCode + phone).replace(/[^0-9]/g, '')
        user.phone = '+' + final_phone
        user.cart = cart
        const day = new Date()
        user.date = day.getTime()
        await cart.save()
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Cargi!');
            res.redirect('/places');
        })
    } catch (e) {
        console.log(e)
        req.flash('error', e.message);
        res.redirect('/places');
    }
}

//renders page to register a vendor in a specific place
module.exports.RenderVendor = async (req, res, next) => {
    try {
        const { id } = req.params
        const place = await Place.findById(id)
        res.render('users/register_vendor', { place })
    }
    catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/camoground')
    }
}

//registers the vendor in the system with stripe onboarding andliked to its proper place
module.exports.RegisterVendor = async (req, res, next) => {

    const { id } = req.params
    const place = await Place.findById(id)
    const { email } = req.body
    const account = await stripe.accounts.create({ type: 'express' });
    const accountLink = await stripe.accountLinks.create({

        account: account.id,
        refresh_url: 'https://chex-bf3796efb5a0.herokuapp.com/places',
        return_url: 'https://chex-bf3796efb5a0.herokuapp.com/places',
        type: 'account_onboarding'
    });

    try {
        const { username, password } = req.body;
        const user = new User({ email, username, password });
        user.places.push(place)
        user.store = true
        user.stripe_account = account.id
        user.is_vendor = true

        place.online_payments = true
        await place.save()
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Cargi!');
            res.redirect(accountLink.url);
        })
    } catch (e) {
        console.log(e)
        req.flash('error', e.message);
        res.redirect('/place');
    }

}


//show route to see your cart
module.exports.RenderCart = async (req, res) => {
    console.log('RenderCart')
    var cart = {}
    var all_posts = []
    if (req.user) {
        const { id } = req.user._id
        const user = await User.findById(id.toString('hex'))
        console.log(user)
        cart = await Carrito.findById(user.cart).populate({
            path: 'pre_orders',
            populate: {
                path: 'posts'
            }
        })
    } else {
        if (!req.session.cart) {
            req.session.cart = []
        }
        cart = req.session.cart
        var cart_price = 0
        for (let i = 0; i < req.session.cart.length; i++) {
            req.session.cart[i].posts = await Post.findById(req.session.cart[i].posts._id)
        }
        all_posts = req.session.cart
        for (let item of all_posts) {
            if (item.price) {
                cart_price += parseInt(item.price)
            } else {
                cart_price += parseInt(item.posts.price)
            }

        }
    }
    console.log(cart)
    cart = req.session.cart
    if (cart.length > 0) {
        var place = await Place.findById(cart[0].posts.place)
        var online_payment = place.online_payments
        const cart_message = false
        const delete_message = false
        const categorizedPosts = {};
        place.posts.forEach(post => {
            const category = post.category; // Assuming each post has a 'category' field
            if (!categorizedPosts[category]) {
                categorizedPosts[category] = [];
            }
            categorizedPosts[category].push(post);
        });
        console.log(cart)
        all_posts = cart
        res.render('users/render_cart', { delete_message, cart_message, all_posts, place, cart_price, online_payment })
    } else {

        req.session.cart = []
        res.render('users/cart_no_items')
    }

}



//shelfed messaging function to create a message
module.exports.createMessage = async (req, res) => {
    const { id } = req.params;
    const to = id
    const to_user = await User.findById(id)
    const from = req.user.id
    var body = req.body.message.body
    const from_user = await User.findById(from)
    body = body + ` - ${from_user.username}`
    const message = new Message({ body, from, to })
    await message.save()
    to_user.messages.push(message.id)
    from_user.messages.push(message.id)
    await from_user.save()
    await to_user.save()
    const user_to = await User.findById(message.to)
    const user_from = await User.findById(message.from)
    const Current_user = await User.findById(req.user.id).populate({
        path: 'messages',
        populate: {
            path: 'to'
        }
    }).populate({
        path: 'messages',
        populate: {
            path: 'from'
        }
    });
    res.render('users/message-active', { message, user_to, user_from, Current_user })
}

//renders orders of final customers
module.exports.RenderMyOrders = async (req, res) => {
    console.log("RenderMyOrders")
    try {
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders',
            populate: {
                path: 'posts'
            }
        }).populate({
            path: 'orders',
            populate: {
                path: 'place'
            }
        })
        console.log(req.session.orders)
        const orders = req.session.orders
        const place = req.session.place
        res.render('users/render_orders', { orders, place })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}


//renders incoming orders to a vendor
module.exports.RenderStoreOrders = async (req, res) => {
    try {
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders_to_complete'
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer'
                }
            }
        ).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'posts'
                }
            }
        ).populate('places')
        console.log(user.orders_to_complete)
        const place = user.places[0]
        const order_completed = 'q'

        res.render('users/render_vendor_orders', { user, place, order_completed })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}

//Renders incomoing orders on a specific location
module.exports.RenderSelect = async (req, res) => {
    console.log('RenderSelect')
    try {
        const section = req.query.section.trim()
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders_to_complete',
            populate: {
                path: 'posts',
            }
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')
        const place = user.places[0]
        const orders = user.orders_to_complete
        const all_posts = []
        for (let order of orders) {
            if (order.section == section) {
                all_posts.push(order)
            }
        }
        const order_completed = 'd'
        res.render('users/render_vendor_section', { user, place, section, all_posts, order_completed })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}


//Completes order
module.exports.completeOrder = async (req, res) => {
    console.log('completeOrder 251')
    try {
        const { id } = req.params
        const order = await Order.findById(id)
        console.log(order)
        order.is_delivered = true
        order.is_paid = true
        await order.save()
        console.log(order.is_paid)
        console.log(order.is_delivered)
        const user = await User.findById(req.user.id).populate('orders_to_complete').populate('places')

        const place = user.places[0]
        const order_completed = order
        res.render('users/render_vendor_orders', { user, place, order_completed })

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}




module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/places';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    req.logout();
    // req.session.destroy();
    req.flash('success', "Goodbye!");
    res.redirect('/places');
}


//updates order status and sends a whatsapp message indicating that the order is 5 min away
module.exports.FiveMin = async (req, res) => {
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('customer')
        order.status = 'Su orden estara lista para recoger en 5 minutos'
        const user = await User.findById(req.user.id).populate({
            path: 'orders_to_complete',
            populate: {
                path: 'posts',
            }
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')

        client.messages
            .create({
                body: 'Su orden estara lista en 5 minutos',
                from: 'whatsapp:+14155238886',
                to: `whatsapp:+15129654086`
            })
            .done()
        await order.save()
        const place = user.places[0]

        const order_completed = 'q'
        res.render('users/render_vendor_orders', { user, place, order_completed })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}



//updates order status and sends a whatsapp message indicating that the order is ready
module.exports.Ready = async (req, res) => {
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('customer')
        const user = await User.findById(req.user.id).populate({
            path: 'orders_to_complete',
            populate: {
                path: 'posts',
            }
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')
        client.messages
            .create({
                body: 'Su orden esta lista para recoger',
                from: 'whatsapp:+14155238886',
                to: `whatsapp:+15129654086`
            })
            .done()
        order.status = 'Orden lista para recoger'
        await order.save()
        const place = user.places[0]
        const order_completed = 'q'
        res.render('users/render_vendor_orders', { user, place, order_completed })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}


module.exports.renderPDF = async (req, res) => {
    try {
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders_to_complete'
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')
        const place = user.places[0]

        res.render('users/order_xlx', { user, place })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}

module.exports.renderReport = async (req, res) => {
    try {
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders_to_complete'
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')
        const place = user.places[0]

        res.render('users/order_xlx', { user, place })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}

module.exports.RenderSelectXlx = async (req, res) => {
    try {
        const section = req.query.section.trim()
        const { id } = req.params
        const user = await User.findById(id).populate({
            path: 'orders_to_complete',
            populate: {
                path: 'posts',
            }
        }).populate(
            {
                path: 'orders_to_complete',
                populate: {
                    path: 'customer',
                }
            }
        ).populate('places')
        const place = user.places[0]
        const orders = user.orders_to_complete
        const all_posts = []
        console.log(orders.length)
        for (let order of orders) {
            if (order.section == section) {
                all_posts.push(order)
            }
        }
        console.log(all_posts)
        res.render('users/render_vendor_section_xlx', { user, place, section, all_posts })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')

    }
}

module.exports.RenderSelectConfirm = async (req, res) => {
    console.log('Render Select Confirm 496')
    console.log(req.query)
    try {
        const section = req.query.trim()
        const { id } = req.params
        const order = await Order.findById(id)
        const user = await User.findById(req.user.id).populate({
            path: 'orders_to_complete'
        }).populate(
            {
                path: 'orders_to_complete'
            }
        ).populate('places')
        order.is_delivered = true
        order.is_paid = true
        await order.save()
        const place = user.places[0]
        const order_completed = order
        const orders = user.orders_to_complete
        const all_posts = []
        for (let order of orders) {
            if (order.section == section) {
                all_posts.push(order)
            }
        }
        res.render('users/render_vendor_section', { all_posts, user, place, order_completed, section })

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/place')
    }
}

module.exports.RenderStripe = async (req, res, next) => {
    console.log('hi')
    try {
        const { id } = req.params
        const place = await Place.findById(id)
        res.render('users/register_stripe.ejs', { place })
    }
    catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/camoground')
    }
}

//registers the vendor in the system with stripe onboarding andliked to its proper place
module.exports.RegisterStripe = async (req, res, next) => {

    const { id } = req.params
    const place = await Place.findById(id)
    const { email } = req.body
    const account = await stripe.accounts.create({ type: 'express' });
    const accountLink = await stripe.accountLinks.create({

        account: account.id,
        refresh_url: 'https://chex-bf3796efb5a0.herokuapp.com/places',
        return_url: 'https://chex-bf3796efb5a0.herokuapp.com/places',
        type: 'account_onboarding'
    });

    try {
        const user = req.user
        user.store = true
        user.stripe_account = account.id

        place.online_payments = true
        await place.save()
        user.is_vendor = true
        user.email = email
        res.redirect(accountLink.url);
    } catch (e) {
        console.log(e)
        req.flash('error', e.message);
        res.redirect('/place');
    }

}

module.exports.renderBulk = async (req, res) => {
    console.log('renderBulk')
    try {
        const { id } = req.params
        console.log(id)
        const order = await Order.findById(id)
        const mult_orders = []
        for (let bulk_order of order.multiple_orders) {
            mult_orders.push(await Order.findById(bulk_order).populate('posts'))
        }
        order.multiple_orders = mult_orders
        console.log(order)
        res.render('users/render_bulk', { order })
    } catch (e) {
        console.log(e)
        req.flash('error', e.message);
        res.redirect('/place');
    }
}
// module.exports.renderForgot = async (req, res) => {
//     res.render("users/forgot");
// };

// module.exports.renderReset = async (req, res) => {
//     res.render("users/reset");
// };

// module.exports.forgot = async (req, res, next) => {
//     try {
//         let algorithm = "aes-256-cbc";
//         let initVector = crypto.randomBytes(16);
//         let message = "This is a secret message";
//         let Securitykey = crypto.randomBytes(32);
//         let cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);
//         let token = cipher.update(message, "utf-8", "hex");
//         token += cipher.final("hex");

//         let user = await User.findOne({ email: req.body.email });

//         if (!user) {
//             req.flash("error", "No account with that email address exists.");
//             return res.redirect("/forgot");
//         }
//         user.resetPasswordToken = token;
//         user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

//         var t = await user.save();

//         var smtpTransport = nodemailer.createTransport({
//             service: "Gmail",
//             auth: {
//                 user: "admin@cargi.heroku.com",
//                 pass: process.env.GMAILPW,
//             },
//         });

//         var mailOptions = {
//             to: user.email,
//             from: "admin@cargi.heroku.com",
//             subject: "Node.js Password Reset",
//             text:
//                 "You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n" +
//                 "Please click on the following link, or paste this into your browser to complete the process:\n\n" +
//                 "http://" +
//                 req.headers.host +
//                 "/reset/" +
//                 token +
//                 "\n\n" +
//                 "If you did not request this, please ignore this email and your password will remain unchanged.\n",
//         };

//         await smtpTransport.sendMail(mailOptions);

//         req.flash(
//             "success",
//             "An e-mail has been sent to " + user.email + " with further instructions."
//         );
//         res.redirect("/forgot");

//     } catch (error) {
//         if (error) return next(error);
//         res.redirect("/forgot");
//     }
// };

// module.exports.getToken = async (req, res) => {
//     const user = await User.findOne({
//         resetPasswordToken: req.params.token,
//         resetPasswordExpires: { $gt: Date.now() },
//     });
//     if (!user) {
//         req.flash("error", "Password reset token is invalid or has expired.");
//         return res.redirect("/forgot");
//     } else {
//         res.render("users/reset", { token: req.params.token });
//     }
// };

// module.exports.postToken = async (req, res) => {
//     try {
//         if (req.params.token) {
//             let token = req.params.token;
//             if (!token) {
//                 req.flash("error", "Password reset token is invalid or has expired.");
//                 return res.redirect("back");
//             }
//             let user = await User.findOne({
//                 resetPasswordToken: token,
//                 resetPasswordExpires: { $gt: Date.now() },
//             });

//             if (!user) {
//                 req.flash("error", "Password reset token is invalid or has expired.");
//                 return res.redirect("back");
//             }

//             if (req.body.password === req.body.confirm) {
//                 async.waterfall(
//                     [
//                         function (done) {
//                             User.findOne(
//                                 {
//                                     resetPasswordToken: req.params.token,
//                                     resetPasswordExpires: { $gt: Date.now() },
//                                 },
//                                 function (err, user) {
//                                     if (!user) {
//                                         req.flash(
//                                             "error",
//                                             "Password reset token is invalid or has expired."
//                                         );
//                                         return res.redirect("back");
//                                     }
//                                     if (req.body.password === req.body.confirm) {
//                                         user.setPassword(req.body.password, function (err) {
//                                             user.resetPasswordToken = undefined;
//                                             user.resetPasswordExpires = undefined;

//                                             user.save(function (err) {
//                                                 req.logIn(user, function (err) {
//                                                     done(err, user);
//                                                 });
//                                             });
//                                         });
//                                     } else {
//                                         req.flash("error", "Passwords do not match.");
//                                         return res.redirect("back");
//                                     }
//                                 }
//                             );
//                         },
//                         function (user, done) {
//                             var smtpTransport = nodemailer.createTransport({
//                                 service: "Gmail",
//                                 auth: {
//                                     user: "emiliano.villarreal99@gmail.com",
//                                     pass: process.env.GMAILPW,
//                                 },
//                             });
//                             var mailOptions = {
//                                 to: user.email,
//                                 from: "emiliano.villarreal99@gmail.com",
//                                 subject: "Your password has been changed",
//                                 text:
//                                     "Hello,\n\n" +
//                                     "This is a confirmation that the password for your account " +
//                                     user.email +
//                                     " has just been changed.\n",
//                             };
//                             smtpTransport.sendMail(mailOptions, function (err) {
//                                 req.flash(
//                                     "success",
//                                     "Success! Your password has been changed."
//                                 );
//                                 done(err);
//                             });
//                         },
//                     ],
//                     function (err) {
//                         res.redirect("/places");
//                     }
//                 );
//             } else {
//                 req.flash("error", "Passwords do not match.");
//                 res.redirect(`/reset/${token}`);
//             }
//         }
//     } catch (error) {
//         req.flash("error", "Something went wrong Please try again.");
//         res.redirect("/forgot");
//     }
// }