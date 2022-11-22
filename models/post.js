const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const palce = require('./place')

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
    category: String,
    images: [ImageSchema],
    caption: String,
    price: Number,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    place: {
        type: Schema.Types.ObjectId,
        ref: 'Place'
    },

});




module.exports = mongoose.model('Post', postSchema);