const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Order = require('./order')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };

const PlaceSchema = new Schema({
    name: String,
    description: String,
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }],
    orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Order'
    }],
    invite: Boolean,
    drop_offs: [String],
    sections: [String],
    categories: [String],
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    online_payments: Boolean
}, opts);


PlaceSchema.virtual('properties.popUpMarkup').get(function () {
    return `
    <strong><a href="/places/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});





module.exports = mongoose.model('Place', PlaceSchema);