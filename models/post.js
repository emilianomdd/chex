const mongoose = require('mongoose');
const Review = require('./review')
const Schema = mongoose.Schema;
const campground = require('./campground')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});

const opts = { toJSON: { virtuals: true } };

const postSchema = new Schema({
    title: String,
    images: [ImageSchema],
    caption: String,
    price: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    campground: {
        type: Schema.Types.ObjectId,
        ref: 'Campground'
    },
    reviews: [{
        type: Schema.Types.ObjectId,
        ref: 'Review'
    }]
});



postSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Review.deleteMany({
            _id: {
                $in: doc.reviews
            }
        })
    }
})

module.exports = mongoose.model('Post', postSchema);