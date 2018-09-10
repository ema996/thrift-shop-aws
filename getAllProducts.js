require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./database-helper.js')

exports.handler = async (event,context,callback) => {
    const client = await db.pool.connect();
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await getProducts(event,client);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } finally {
        client.release();
    }
}


async function getProducts (event,client) {
    var result = await client.query(queryBuilder.getProducts());

    if(!result) {
        var err = createError(500,'There is an error');
        throw err;
    }

    return result.rows;
}
