const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const Place = require('./place')
const Review = require('./review')
const Message = require('./message')
const Post = require('./post')
const Order = require('./order')
const Carrito = require('./carrito')

const UserSchema = new Schema({
    is_vendor: Boolean,
    is_manager: Boolean,
    is_cartero: Boolean,
    date: Date,
    store: Boolean,
    stripe_account: String,
    phone: String,
    email: { type: String, unique: true, required: true },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    email: {
        type: String,
        required: true,
        unique: true
    },
    cart: {
        type: Schema.Types.ObjectId,
        ref: 'Carrito'
    },
    username: String,
    orders_to_complete: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    places: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Place'
        }
    ],
    reviews: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Review'
        }
    ],
    messages: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Message'
        }
    ],
    isAdmin: { type: Boolean, default: false }
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);