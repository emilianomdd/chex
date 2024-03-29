if (process.env.NODE_ENV !== "production") {
    require('dotenv').config();
}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const userRoutes = require('./routes/users');
const placeRoutes = require('./routes/places');
const postRoutes = require('./routes/posts')
const cartRoutes = require('./routes/carts')
const orderRoutes = require('./routes/orders')
const Order = require('./models/order')

const MongoDBStore = require("connect-mongo")(session);

const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/yelp-camp';

mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();

app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')))
app.use(mongoSanitize({
    replaceWith: '_'
}))
const secret = process.env.SECRET || 'thisshouldbeabettersecret!';

const store = new MongoDBStore({
    url: dbUrl,
    secret,
    touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
    console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
    store,
    name: 'session',
    secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}

app.use(session(sessionConfig));
app.use(flash());
app.use(helmet());


const scriptSrcUrls = [
    "https://stackpath.bootstrapcdn.com",
    "https://api.tiles.mapbox.com",
    "https://api.mapbox.com",
    "https://kit.fontawesome.com",
    "https://cdnjs.cloudflare.com",
    "https://cdn.jsdelivr.net",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com",
    "https://stackpath.bootstrapcdn.com",
    "https://api.mapbox.com",
    "https://api.tiles.mapbox.com",
    "https://fonts.googleapis.com",
    "https://use.fontawesome.com",
];
const connectSrcUrls = [
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["blob:"],
            objectSrc: [],
            imgSrc: [
                "'self'",
                "blob:",
                "data:",
                "https://res.cloudinary.com/squr/", //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.use('/', userRoutes);
app.use('/places', placeRoutes)
app.use('/posts', postRoutes)
app.use('/cart', cartRoutes)
app.use('/orders', orderRoutes)

app.get('/', (req, res) => {
    res.render('home')
});

app.get('/complete_order/:id', async (req, res) => {
    const { id } = req.params
    const order = await Order.findById(id).populate('place')
    console.log(order)
    order.is_paid = true
    const post_author = await User.findById(order.place.author)
    post_author.orders_to_complete.push(order)
    req.session.orders.push(order)
    const orders = req.session.orders
    const order_message = 'true'
    const place = order.place
    await order.save()
    await post_author.save()

    res.render('users/render_orders', { orders, order_message, place })
});

app.get('/complete_order_cart/:id', async (req, res) => {
    console.log('complete_order_cart')
    const { id } = req.params
    const order = await Order.findById(id).populate('place')
    console.log("+_)(*&^%$#@#$%^&*()_^%#$@#@$%^&^%%$#@#!$%^&^*UYJHTGDFSDADEWR$%^Y$H", order)
    order.is_paid = true
    req.session.cart = []
    console.log(order.place)
    console.log(order.place.author)
    const post_author = await User.findById(order.place.author)
    post_author.orders_to_complete.push(order)
    req.session.orders.push(order)
    const orders = req.session.orders
    const order_message = 'true'
    const place = order.place
    await post_author.save()
    await order.save()
    console.log()
    res.render('users/render_orders', { orders, order_message, place })
});

app.get('/cancel_order/:id', async (req, res) => {
    const { id } = req.params
    const order = await Order.findById(id).populate('place')
    const post_author = await User.findById(order.place.author)
    const place = order.place

    var transaction_fee = ((order.price + .3) / (1 - .059)) - order.price
    transaction_fee = transaction_fee.toFixed(2)
    const price = order.price_final
    const cancel_msg = 'cancelOrder'

    res.render('places/payment_method', { cancel_msg, post_author, order, transaction_fee, price })
});


app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Serving on port ${port}`)
})
