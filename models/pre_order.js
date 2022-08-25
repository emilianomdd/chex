const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Pre_order = require('./pre_order')
const Order = require('./order')
const Post = require('./post')
const Campground = require('./campground')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const Pre_orderSchema = new Schema({
    price: Number,
    price_total: Number,
    is_delivered: Boolean,
    posts: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    seat: String,
    section: String,
    ready: String,
    five: String,
    campground: {
        type: Schema.Types.ObjectId,
        ref: 'Campground'
    },
    quantity: Number,
    drop_off: String,
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    conf_num: Number
});




module.exports = mongoose.model('Pre_order', Pre_orderSchema);