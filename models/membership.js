const mongoose = require('mongoose');
const Review = require('./review')
const Schema = mongoose.Schema;
const User = require('./user')
const Post = require('./post')
const Campground = require('./campground')

const opts = { toJSON: { virtuals: true } };

const ImageSchema = new Schema({
    url: String,
    filename: String
});

ImageSchema.virtual('thumbnail').get(function () {
    return this.url.replace('/upload', '/upload/w_200');
});


const membershipSchema = new Schema({
    member: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    description: String,
    images: [ImageSchema],
    tags: [String],
    meetio: {
        type: Schema.Types.ObjectId,
        ref: 'Campground'
    },
    posts: [{
        type: Schema.Types.ObjectId,
        ref: 'Post'
    }]
}, opts);






module.exports = mongoose.model('Membership', membershipSchema);