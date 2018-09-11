require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token');
const db = require('./db.js')

exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await loginFunc(event);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } 
}

async function loginFunc (event) {
    var username = event.body.username;
    var pass = event.body.pass;

    if(!username) {
        var err = createError(400, 'Please enter your username');
        throw err;
    }

    if(!pass) {
        var err = createError(400, 'Please enter your password');
        throw err;
    }

        var hash = crypto.createHash('sha256').update(pass).digest('base64');
        var checkUsernameAndPass = await db.query(queryBuilder.checkUsernameAndPass(),[username,hash]);

        if(checkUsernameAndPass.rowCount == 0) {
            var err = createError(401, 'Unauthorized');
            throw err;
        }

    return {"token": checkUsernameAndPass.rows[0].token};
    }