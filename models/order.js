const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Order = require('./order')
const Post = require('./post')
const Place = require('./place')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const OrderSchema = new Schema({
    price: Number,
    price_final: Number,
    name: String,
    is_delivered: Boolean,
    is_reported: Boolean,
    posts: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    multiple_orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    stripe_fee: Number,
    plat_fee: Number,
    is_multiple: Boolean,
    seat: String,
    letter: String,
    is_paid: Boolean,
    section: String,
    status: String,
    place: {
        type: Schema.Types.ObjectId,
        ref: 'Place'
    },
    quantity: Number,
    drop_off: String,
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    date: Date,
    email: String,
    tip: Number,
    cash: Boolean,
    conf_num: Number,
    tip: Number
});




module.exports = mongoose.model('Order', OrderSchema);