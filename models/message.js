const mongoose = require('mongoose');
const User = require('./user')
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
    body: [String],
    from: String,
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
});


module.exports = mongoose.model('Message', MessageSchema);