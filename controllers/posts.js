const Place = require('../models/place');
const User = require('../models/user');
const place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Post = require('../models/post');
const Order = require('../models/order');
const Pre_order = require('../models/pre_order');
const Carrito = require('../models/carrito')
const { jsPDF } = require('jspdf');
const order = require('../models/order');
const XLSX = require('xlsx');
const users = require('../controllers/users');
const path = require('path')
const flash = require('connect-flash');
const { CommandInstance } = require('twilio/lib/rest/preview/wireless/command');
const fs = require("fs")


//Creates an article in a place
module.exports.createPost = async (req, res, next) => {
    try {
        const { id } = req.params
        const post = new Post(req.body.post);
        const user = await User.findById(req.user._id);
        post.images = req.files.map(f => ({ url: f.path, filename: f.filename }));
        post.author = req.user._id;
        post.category = req.body.category
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
        console.log(e)
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
        order.is_reported = false
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
        if (req.user.id) {
            const user = await User.findById(req.user.id).populate('messages')
            user.orders.push(order)
            order.user = user
            await user.save()
        }
        var price = (pre_order.price + .3) / (1 - 0.066)
        price = price.toFixed(2)
        order.price_final = price
        var comish = price - order.price
        comish = comish.toFixed(2)
        await post_author.save()
        await order.save()
        if (!req.session.orders) {
            req.session.orders = [order]
        } else {
            req.session.orders.push(order)
        }
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
        console.log(e)
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
        console.log(e)
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
        pre_order.posts = post
        pre_order.section = req.body.section
        pre_order.letter = req.body.row
        pre_order.seat = req.body.seat
        pre_order.price = parseInt(req.body.how_many) * post.price
        var price = (pre_order.price + 3) / (1 - 0.4)
        price = price.toFixed(2)
        pre_order.price_final = price
        pre_order.quantity = req.body.how_many
        if (req.session.cart) {
            req.session.cart.push(pre_order)
        } else {
            req.session.cart = [pre_order]
        }
        console.log(req.session.cart, '*********')
        console.log(pre_order, 'PRE_ORDER')
        await pre_order.save()
        const place = post.place
        const all_posts = place.posts
        const seat = pre_order.seat
        const row = pre_order.letter
        const section = pre_order.section
        const cart_message = true
        res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section, cart_message })
    } catch (e) {
        console.log(e)
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
        console.log(e)
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
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    };
}
//delete posts
module.exports.deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.find(id)
        await Post.findByIdAndDelete(post);
        req.flash('success', 'Successfully deleted post')
        res.redirect('/places');
    } catch (e) {
        console.log(e)
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
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//creates order but doesn't show anyewhere until iser specifies ppayment method
module.exports.RapidOrder = async (req, res) => {
    console.log("RapidOrder")
    try {
        const { id } = req.params
        const post = await Post.findById(id).populate({
            path: 'place',
            populate: {
                path: 'posts'
            }
        }).populate('author')
        const post_author = post.author
        const order = new Order()
        order.is_reported = false
        order.status = 'En proceso'
        const day = new Date()
        order.date = day.getTime()

        order.is_paid = false
        order.is_delivered = false
        order.posts = post
        order.name = post.title
        order.email = req.body.email
        if (req.body.drop_off != 'N/A') {

            order.drop_off = req.body.drop_off
        }
        if (req.body.section != 'N/A') {

            order.section = req.body.section
        }
        order.seat = req.body.seat
        order.letter = req.body.row
        order.price = parseInt(req.body.how_many) * post.price
        var price = (order.price + 3) / (1 - .04)
        price = price.toFixed(2)
        order.price_final = price
        var transaction_fee = ((order.price + .3) / (1 - .059)) - order.price
        transaction_fee = transaction_fee.toFixed(2)
        order.quantity = req.body.how_many
        order.place = post.place
        order.conf_num = Math.floor(1000 + Math.random() * 9000);
        await post_author.save()
        await order.save()
        // if (!req.session.orders) {
        //     req.session.orders = [order]
        // } else {
        //     req.session.orders.push(order)
        // }
        console.log(post_author)
        res.render('places/payment_method', { post_author, order, transaction_fee, price })
    }
    catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//see what this is for?
module.exports.RenderConfirmOrder = async (req, res) => {
    try {
        const order = new Order()
        order.is_reported = false
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
        if (!req.session.orders) {
            req.session.orders = [order]
        } else {
            req.session.orders.push(order)
        }
        const all_posts = place.posts
        res.render('places/show.ejs', { place, all_posts })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//deletes pre order
module.exports.Delete = async (req, res) => {
    try {
        const { id } = req.params
        const pre = await Pre_order.findById(id)
        await Pre_order.findByIdAndDelete(id)
        for (let i = 0; i < req.session.cart.length; i++) {
            if (!await Pre_order.findById(req.session.cart[i].id)) {

                req.session.cart.splice(i, 1);
            }
        }
        const all_posts = req.session.cart

        const place = req.session.place
        res.render('users/render_cart', { all_posts, place })
    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}


module.exports.purchaseCash = async (req, res) => {
    try {
        if (req.user) {
            const { id } = req.params
            const pre_order = await Pre_order.findById(id).populate('posts')
            const see_pre = await Pre_order.findById(id).populate('posts')
            const post_author = await User.findById(pre_order.posts.author)
            const order = new Order()
            order.is_reported = false
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
            order.price = post.price
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
            if (!req.session.orders) {
                req.session.orders = [order]
            } else {
                req.session.orders.push(order)
            }
            await place.save()
            const cart = await Carrito.findById(user.cart).populate({
                path: 'pre_orders',
                populate: {
                    path: 'posts'
                }
            })
            const all_posts = cart.pre_orders
            res.render('users/render_cart', { user, all_posts })
        } else {
            const { id } = req.params
            const pre_order = await Pre_order.findById(id).populate('posts')
            const place = await Place.findById(pre_order.posts.place)
            const see_pre = await Pre_order.findById(id).populate('posts')
            const post_author = await User.findById(pre_order.posts.author)
            const order = new Order()
            order.is_reported = false
            order.status = 'En proceso'
            const day = new Date()
            order.date = day.getTime()
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
            order.price = pre_order.posts.price
            var price = (pre_order.price + .3) / (1 - 0.59)
            price = price.toFixed(2)
            order.price_final = price
            order.place = pre_order.posts.place
            order.is_delivered = false
            order.is_paid = false
            order.cash = true
            await Pre_order.findByIdAndDelete(id)
            place.orders.push(order)
            order.conf_num = Math.floor(1000 + Math.random() * 9000);


            await post_author.save()
            await order.save()
            if (!req.session.orders) {
                req.session.orders = [order]
            } else {
                req.session.orders.push(order)
            }
            await place.save()
            const all_posts = req.session.cart
            res.render('users/render_cart', { all_posts })
        }
    } catch (e) {
        console.log(e)
        const all_posts = req.session.cart
        req.flash('Favor de Refrescar Pagine e intentar de nuevo');
        res.render('users/render_cart', { all_posts });
    }
}



//route used when user decides to do rapid checkout and uses cash
module.exports.RapidCash = async (req, res) => {
    try {
        console.log(req.body)
        console.log(req.params)
        console.log(req.query)
        const { id } = req.params
        const order = await Order.findById(id).populate({
            path: 'place',
            populate: {
                path: 'posts'
            }
        }).populate('posts')
        const place = order.place
        place.orders.push(order)
        const post_author = await User.findById(order.posts.author)
        post_author.orders_to_complete.push(order)
        order.cash = true
        order.is_delivered = false
        order.tip = (parseInt(req.body.tip) / 100) * order.price
        order.email = req.body.user_email
        if (order.email) {
            //send email with twilio!!!!!!!!!!
        }
        await place.save()
        await post_author.save()
        await order.save()
        if (!req.session.orders) {
            req.session.orders = [order]
        } else {
            req.session.orders.push(order)
        }
        const all_posts = place.posts

        const seat = order.seat
        const row = order.letter
        const section = order.section
        const order_message = true
        res.render('places/show_numbered.ejs', { place, all_posts, seat, row, section, order_message })

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//route used when user chooses to pay with card after rapid checkout
module.exports.RapidCard = async (req, res) => {
    console.log('RapidCard')
    console.log(req.body.user_email)
    console.log(req.params)
    console.log(req.query)
    try {
        const { id } = req.params
        const order = await Order.findById(id).populate('place').populate('posts')
        order.cash = false
        order.email = req.body.user_email
        order.tip = parseInt(req.body.tip) * order.price / 100
        await order.save()
        var price = (order.price + order.tip + 3) / (1 - 0.04)
        price = price.toFixed(2)
        var comish = price - order.price - order.tip
        comish = comish.toFixed(2)
        order.price_final = price
        await order.save()
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            invoice_creation: { enabled: true },
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: order.posts.title,
                    },
                    unit_amount: order.price * 100,
                },
                quantity: order.quantity
            }, {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: 'fees',
                    },
                    unit_amount: Math.trunc(comish * 100),
                }, quantity: 1
            }, {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: 'tip',
                    },
                    unit_amount: order.tip * 100,
                }, quantity: 1
            }],
            mode: 'payment',
            success_url: `https://cargi.herokuapp.com/complete_order/${order.id}`,
            cancel_url: `https://cargi.herokuapp.com/cancel_order/${order.id}`,
        });
        res.redirect(session.url)

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

// try {
//     const how_many = req.body.how_many.split(',')
//     const cart = req.session.cart
//     const day = new Date()
//     const post_author = await User.findById(cart[0].posts.author)

//     const order = new Order()
//     order.is_reported = false
//     order.date = day.getTime()
//     order.email = req.body.email
//     order.price = req.body.price
//     order.price_final = req.body.total
//     order.place = cart[0].posts.place
//     order.is_delivered = false
//     order.is_paid = false
//     order.cash = false

//     order.quantity_per = {}
//     for (let each_item of cart) {
//         if (order.posts.includes(each_item.posts._id)) {
//             console.log(each_item.posts._id in order.posts)
//             continue
//         } else {
//             order.posts.push(each_item.posts._id)
//         }
//     }
//     for (let i = 0; i < cart.length; i++) {
//         console.log(parseInt(how_many[i]))
//         if (cart[i].posts._id in order.quantity_per) {
//             const new_amt = parseInt(how_many[i]) + order.quantity_per[cart[i].posts._id]

//             order.quantity_per[cart[i].posts._id] = new_amt
//         } else {
//             order.quantity_per[cart[i].posts._id] = parseInt(how_many[i])
//         }
//     }
//     order.conf_num = Math.floor(1000 + Math.random() * 9000);
//     post_author.orders_to_complete.push(order)
//     await post_author.save()
//     await order.save()
//     const { id } = req.params
//     order.cash = false
//     await order.save()
//     // const user = await User.findById(req.user.id)
//     const email = req.body.email
//     var price = (order.price + 3) / (1 - 0.036)
//     price = price.toFixed(2)
//     var comish = price - order.price
//     comish = comish.toFixed(2)
//     order.price_final = price
//     await order.save()
//     const each_item = []
//     console.log(order)
//     for (let each_id of order.posts) {
//         console.log(each_id)
//         const each_one = await Post.findById(each_id)
//         const price = each_one.price * 100
//         const item_deets = { 'name': each_one.title, 'quantity': order.quantity_per[each_id], 'price': price }
//         each_item.push(item_deets)
//     }
//     var fees = order.price_final - order.price
//     fees = fees.toFixed(2)
//     each_item.push({
//         'name': 'fees', 'quantity': 1, 'price': Math.trunc(fees * 100)
//     })





// }
// catch (e) {
//     console.log(e)
//     req.flash('Refresca la Pagina e Intenta de Nuevo')
//     res.render('/places')
// }

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
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.render('/places')
    }
}

//grab the orders and create a pdf invoce with the selected items
module.exports.createPDF = async (req, res, next) => {
    try {
        const id = req.body.id
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        var txtFormat = ''
        var recipt_name = ''
        if (typeof id != "string") {
            for (let id_num of id) {

                const order = await Order.findById(id_num).populate('customer')

                if (order.customer) {
                    txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Nombre: ${order.customer.username}\nAsiento: ${order.seat}${order.letter} -- Seccion: ${order.section}\
            \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                    recipt_name += order.name, ","
                } else {
                    txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Asiento: ${order.seat}${order.letter}\n -- Seccion: ${order.section}\
                \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                    recipt_name += order.name, ","
                }

            }
        } else {
            const order = await Order.findById(id).populate('customer')

            if (order.customer) {
                txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Nombre: ${order.customer.username}\nAsiento: ${order.seat}${order.letter} -- Seccion: ${order.section}\
        \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                recipt_name += order.name, ","
            } else {
                txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Asiento: ${order.seat}${order.letter}\n -- Seccion: ${order.section}\
            \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                recipt_name += order.name, ","
            }
        }
        doc.text(txtFormat, 20, 20)
        const date = new Date();
        month = date.getMonth() + 1
        day = date.getDate()
        year = date.getFullYear()

        file_num = Math.floor(1000 + Math.random() * 9000);
        doc.save(`${day}_${month}_${year}--${file_num}.pdf`)

        const id_user = req.user.id
        const user = await User.findById(id_user).populate({
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
        const place = user.places[0]


        res.render('users/render_vendor_orders', { user, place })

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/places')
    }
}

module.exports.createReport = async (req, res) => {
    try {
        const workBook = XLSX.utils.book_new();

        const id = req.body.id
        console.log(id)
        var all_orders = []
        for (let id_num of id) {
            const order = await Order.findById(id_num)
            if (order.is_multiple) {
                for (let i of order.multiple_orders) {
                    console.log(i)
                    const each_order = await Order.findById(i)
                    if (each_order) {
                        console.log(each_order)
                        const post = await Post.findById(each_order.posts)
                        const new_order = { email: order.email, quantity: each_order.quantity, price: each_order.price, articulo: post.title, date: order.date, section: order.section }
                        all_orders.push(new_order)
                    } else {
                        continue
                    }
                }
            } else {
                const new_order = { email: order.email, quantity: order.quantity, price: order.price, articulo: order.name, date: order.date, section: order.section }
                all_orders.push(new_order)
            }
            order.is_reported = true
            order.save()
        }

        const workSheet = XLSX.utils.json_to_sheet(all_orders);
        XLSX.utils.book_append_sheet(workBook, workSheet, "orders")
        // Generate buffer
        const date = new Date();
        month = date.getMonth() + 1
        day = date.getDate()
        year = date.getFullYear()

        file_num = Math.floor(1000 + Math.random() * 9000);
        const filename = `${day}_${month}_${year}--${file_num}.xlsx`;
        // Create a new workbook options object
        const wb_opts = { bookType: "xlsx", type: "buffer" };

        // Write the workbook to a buffer
        const xl_file = XLSX.write(workBook, wb_opts);

        // Set the Content-Type and Content-Disposition headers and send the buffer as the response
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.send(xl_file);
        fs.unlink(filename, err => {
            if (err) {
                console.error(err);
            }
        });

        // const wb_opts = { bookType: 'xlsx', type: 'binary' };   // workbook options
        // const xl_file = XLSX.writeFile(workBook, filename, wb_opts)
        // // res.sendFile(xl_file);
        // res.download(`${filename}`)

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/')
    }
}

module.exports.showPostNum = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id).populate("place");
        const place = post.place;
        const seat = req.query.seat
        const row = req.query.row
        const section = req.query.section
        if (req.query.seat) {
            res.render("posts/show_num", { post, place, seat, row, section })
        } else {
            res.render("posts/show", { post, place })
        }

    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/')
    };
}
//show  route for when user clicks rapid checkout
module.exports.ShowRapidNum = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findById(id).populate("place");
        const place = post.place;

        const seat = req.query.seat
        const row = req.query.row
        const section = req.query.section
        if (req.query.seat) {
            res.render("posts/show_rapid_num", { post, place, seat, row, section })
        } else {
            res.render("posts/show", { post, place })
        }


    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/')
    }
}

module.exports.createPDFSection = async (req, res) => {
    try {
        const id = req.body.id
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        var txtFormat = ''
        var recipt_name = ''
        if (typeof id != "string") {
            for (let id_num of id) {

                const order = await Order.findById(id_num).populate('customer')

                if (order.customer) {
                    txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Nombre: ${order.customer.username}\nAsiento: ${order.seat}${order.letter} -- Seccion: ${order.section}\
            \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                    recipt_name += order.name, ","
                } else {
                    txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Asiento: ${order.seat}${order.letter}\n -- Seccion: ${order.section}\
                \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                    recipt_name += order.name, ","
                }

            }
        } else {
            const order = await Order.findById(id).populate('customer')

            if (order.customer) {
                txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Nombre: ${order.customer.username}\nAsiento: ${order.seat}${order.letter} -- Seccion: ${order.section}\
        \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                recipt_name += order.name, ","
            } else {
                txtFormat += `Cantidad: ${order.quantity} -- Articulo: ${order.name} -- Precio: ${order.price} -- Asiento: ${order.seat}${order.letter}\n -- Seccion: ${order.section}\
            \n*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*\n`
                recipt_name += order.name, ","
            }
        }
        doc.text(txtFormat, 20, 20)
        const date = new Date();
        month = date.getMonth() + 1
        day = date.getDate()
        year = date.getFullYear()

        file_num = Math.floor(1000 + Math.random() * 9000);

        const id_user = req.user.id
        const user = await User.findById(id_user).populate({
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
        const place = user.places[0]
        const orders = user.orders_to_complete
        const section = req.body.section
        const all_posts = []
        for (let order of orders) {
            if (order.section == section) {
                all_posts.push(order)
            }
        }
        res.sendFile(doc)
        res.render('users/render_vendor_section', { user, place, section, all_posts })


    } catch (e) {
        console.log(e)
        req.flash('Refresca la Pagina e Intenta de Nuevo')
        res.redirect('/places')
    }
}

module.exports.carritoOrdena = async (req, res) => {
    console.log(req.body)
}