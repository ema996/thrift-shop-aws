require('dotenv').config();
var createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./database-helper');

exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await signup(event);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    }
}

async function signup(event) {
    const client = await db.pool.connect();
    var first_name = event.body.first_name;
    var last_name = event.body.last_name;
    var username = event.body.username;
    var pass = event.body.pass;
    var balance = event.body.balance;

    if(!first_name) {
        var err = createError(400, 'Please enter your first_name');
        throw err;
    }

    if(!last_name) {
        var err = createError(400, 'Please enter your last_name');
        throw err;
    }

    if(!username) {
        var err = createError(400, 'Please enter your username');
        throw err;
    }

    if(!pass) {
        var err = createError(400, 'Please enter your pass');
        throw err;
    }

    if(!balance) {
        var err = createError(400, 'Please enter your balance');
        throw err;
    }

    console.log("Nekoj tekst");
    var checkUser = await client.query(queryBuilder.checkIfUserExist(),[username]);
    console.log(checkUser);
    if(checkUser.rowCount > 0) {   
        var err = createError(404, 'User already exist.');
        throw err;
    }

    var hash = crypto.createHash('sha256').update(pass).digest('base64');
    var token = generateToken.generateToken ();
    var result = await client.query(queryBuilder.createUser(), [first_name, last_name, username,hash, balance,token]);
    
    return result.rows[0];

}

