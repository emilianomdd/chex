const mongoose = require('mongoose');
const Review = require('./review')
const Schema = mongoose.Schema;
const Membership = require('./membership')
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

const CampgroundSchema = new Schema({
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
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    members: [{

        type: Schema.Types.ObjectId,
        ref: 'Membership'


    }]
}, opts);


CampgroundSchema.virtual('properties.popUpMarkup').get(function () {
    return `
    <strong><a href="/campgrounds/${this._id}">${this.title}</a><strong>
    <p>${this.description.substring(0, 20)}...</p>`
});



CampgroundSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})

module.exports = mongoose.model('Campground', CampgroundSchema);