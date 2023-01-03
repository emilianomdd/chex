const Place = require('../models/place');
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });
const { cloudinary } = require("../cloudinary");
const User = require('../models/user');
const place = require('../models/place');
const stripe = require('stripe')(process.env.STRIPE_KEY)
const Order = require('../models/order')
const Pre_order = require('../models/pre_order')

module.exports.completeRapidOrder = async (req, res) => {
    console.log('we here')
    res.redirect('/')
}