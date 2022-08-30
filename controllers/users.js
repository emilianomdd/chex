const User = require('../models/user');
const Campground = require('../models/campground');
const Message = require('../models/message');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Membership = require('../models/membership');
const Order = require('../models/order')
const Carrito = require('../models/carrito')
const accountSid = process.env.TW_ID;
const authToken = process.env.TW_AUTH;
const client = require('twilio')(accountSid, authToken);
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
        await cart.save()
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Cargi!');
            res.redirect('/campgrounds');
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect('/campgrounds');
    }
}

module.exports.RenderVendor = async (req, res, next) => {
    const { id } = req.params
    const campground = await Campground.findById(id)
    res.render('users/register_vendor', { campground })
}

module.exports.RegisterVendor = async (req, res, next) => {
    const { id } = req.params
    const campground = await Campground.findById(id)
    const { email } = req.body
    const account = await stripe.accounts.create({ type: 'express' });
    const accountLink = await stripe.accountLinks.create({

        account: account.id,
        refresh_url: 'https://cargi.herokuapp.com/campgrounds',
        return_url: 'https://cargi.herokuapp.com/campgrounds',
        type: 'account_onboarding'
    });

    try {
        const { username, password } = req.body;
        const user = new User({ email, username, password });
        user.campgrounds.push(campground)
        user.store = true
        user.stripe_account = account.id
        const registeredUser = await User.register(user, password);
        req.login(registeredUser, err => {
            if (err) return next(err);
            req.flash('success', 'Welcome to Cargi!');
            res.redirect(accountLink.url);
        })
    } catch (e) {
        req.flash('error', e.message);
        res.redirect(accountLink.url);
    }

}



module.exports.RenderCart = async (req, res) => {

    const { id } = req.params
    const user = await User.findById(id)
    const cart = await Carrito.findById(user.cart).populate({
        path: 'pre_orders',
        populate: {
            path: 'posts'
        }
    })
    const all_posts = cart.pre_orders
    res.render('users/render_cart', { user, all_posts })

}

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

module.exports.RenderMyOrders = async (req, res) => {
    const { id } = req.params
    const user = await User.findById(id).populate({
        path: 'orders',
        populate: {
            path: 'posts'
        }
    })

    res.render('users/render_orders', { user })
}

module.exports.RenderStoreOrders = async (req, res) => {
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
    ).populate('campgrounds')
    const campground = user.campgrounds[0]
    res.render('users/render_vendor_orders', { user, campground })
}

module.exports.RenderSelect = async (req, res) => {
    const section = req.query.section
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
    ).populate('campgrounds')
    const campground = user.campgrounds[0]
    res.render('users/render_vendor_section', { user, campground, section })
}

module.exports.completeOrder = async (req, res) => {
    const { id } = req.params
    const order = await Order.findById(id)
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
    ).populate('campgrounds')
    client.messages
        .create({
            body: 'Su orden ha sido entregada',
            from: 'whatsapp:+14155238886',
            to: `whatsapp:+15129654086`
        })
        .done()
    order.is_delivered = true
    order.is_paid = true
    await order.save()

    const campground = user.campgrounds[0]
    res.render('users/render_vendor_orders', { user, campground })

}

module.exports.renderActiveMessage = async (req, res) => {
    const { id } = req.params
    const message = await Message.findById(id)
    var txt = req.body.message.body
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
    txt = txt + ` - ${Current_user.username}`
    const user_to = await User.findById(message.to)
    const user_from = await User.findById(message.from)
    message.body.push(txt)
    await message.save()
    res.render('users/message-active', { message, user_to, user_from, Current_user })
}

module.exports.renderActiveMessageOther = async (req, res) => {
    const { id } = req.params
    const message = await Message.findById(id)
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
    const user_to = await User.findById(message.to)
    const user_from = await User.findById(message.from)
    res.render('users/message-active', { message, user_to, user_from, Current_user })
}

module.exports.renderMessage = async (req, res) => {
    const user = await User.findById(req.params.id)
    res.render('users/message', { user })
}

module.exports.renderMessages = async (req, res) => {
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
    res.render('users/render-messages', { Current_user })
}
module.exports.renderLogin = (req, res) => {
    res.render('users/login');
}

module.exports.login = (req, res) => {
    req.flash('success', 'welcome back!');
    const redirectUrl = req.session.returnTo || '/campgrounds';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
}

module.exports.logout = (req, res) => {
    req.logout();
    // req.session.destroy();
    req.flash('success', "Goodbye!");
    res.redirect('/campgrounds');
}



module.exports.showUserSpace = async (req, res) => {
    const user = await User.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'campgrounds'
        }
    }).populate('campgrounds')
    const campgrounds = user.campgrounds
    res.render('users/show_user', { user, campgrounds })
}



module.exports.createMembership = async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    const user = await User.findById(req.user.id)
    const membership = new Membership(req.body.membership)
    user.memberships.push(campground)
    membership.member = user
    membership.meetio = campground
    await membership.save()
    campground.members.push(membership)
    await user.save()
    await campground.save()
    res.redirect(`/campgrounds/${campground.id}`)
}

module.exports.showUser = async (req, res) => {
    const { id } = req.params

    const user = await User.findById(id).populate('posts')
    res.render('users/show_user.ejs', { user })


}

module.exports.renderMember = async (req, res) => {
    const campground = await Campground.findById(req.params.id)
    res.render('users/create_membership', { campground })
}



module.exports.FiveMin = async (req, res) => {
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
    ).populate('campgrounds')

    client.messages
        .create({
            body: 'Su orden estara lista en 5 minutos',
            from: 'whatsapp:+14155238886',
            to: `whatsapp:+15129654086`
        })
        .done()
    await order.save()
    const campground = user.campgrounds[0]
    res.render('users/render_vendor_orders', { user, campground })
}

module.exports.Ready = async (req, res) => {
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
    ).populate('campgrounds')
    client.messages
        .create({
            body: 'Su orden esta lista para recoger',
            from: 'whatsapp:+14155238886',
            to: `whatsapp:+15129654086`
        })
        .done()
    order.status = 'Orden lista para recoger'
    await order.save()
    const campground = user.campgrounds[0]
    res.render('users/render_vendor_orders', { user, campground })
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
//                         res.redirect("/campgrounds");
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
// };