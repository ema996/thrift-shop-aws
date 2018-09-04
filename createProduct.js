require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token');
const db = require('./database-helper.js')

exports.handler = async (event,context,callback) => {
    console.log(context);
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = 'ema'
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    }
}


