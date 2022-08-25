const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Order = require('./order')
const Post = require('./post')
const Campground = require('./campground')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const OrderSchema = new Schema({
    price: Number,
    price_final: Number,
    is_delivered: Boolean,
    posts: {
        type: Schema.Types.ObjectId,
        ref: 'Post'
    },
    seat: String,
    is_paid: Boolean,
    section: String,
    status: String,
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
    date: Date,
    cash: Boolean,
    conf_num: Number
});




module.exports = mongoose.model('Order', OrderSchema);