require('dotenv').config();
const createError=require('http-errors');
const queryBuilder=require('./queryBuilder.js');
const crypto=require('crypto');
const generateToken=require('./token.js');
const db=require('./database-helper.js');

exports.handler = async (event,context,callback) => {
    const client = await db.pool.connect();
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await getAllOrders(event,client);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } finally{
        client.release();
    }
}

async function getAllOrders (event,client) {
    var user_id = event.context.userId;
    var queryResult = await client.query(queryBuilder.getOrders(),[user_id]);
    return queryResult.rows;
    
}
