require('dotenv').config();
const createError=require('http-errors');
const queryBuilder=require('./queryBuilder.js');
const crypto=require('crypto');
const generateToken=require('./token.js');
const db=require('./db.js');

exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await getAllOrders(event);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } 
}

async function getAllOrders (event) {
    var user_id = event.context.userId;
    var queryResult = await db.query(queryBuilder.getOrders(),[user_id]);
    return queryResult.rows;
    
}
