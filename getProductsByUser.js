require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./db.js')

exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await getProductsByUser(event);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } 
}

async function getProductsByUser(event) {
    console.log('Ova e eventot: ',event);
    var user_id= event.context.userId;
    console.log(user_id);
    var queryResult = await db.query(queryBuilder.getProductsByUserId(),[user_id]);

    if(!queryResult) {
        var err=createError(500,'There is an error');
        throw err;
    }
    
    console.log(queryResult.rows);
    return queryResult.rows;
}
