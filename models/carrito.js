const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Pre_order = require('./pre_order')
const Order = require('./order')
const Post = require('./post')
const Place = require('./place')
const User = require('./user')

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png



const CarritoSchema = new Schema({
    pre_orders: [{
        type: Schema.Types.ObjectId,
        ref: 'Pre_order'
    }]
}
);




module.exports = mongoose.model('Carrito', CarritoSchema);