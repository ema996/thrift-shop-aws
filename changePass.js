require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./database-helper.js')

exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await changePass(event);
        callback(null,data)
    } catch (err) { 
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    }
}

async function changePass(event) {    
    var oldPasw=event.body.oldPasw;
    console.log(oldPasw);
    var newPasw=event.body.newPasw;
    console.log(newPasw);
    var confirmNewPasw=event.body.confirmNewPasw;
    console.log(confirmNewPasw);
    var user_id= event.context.userId;

    const client = await db.pool.connect();
    if(!oldPasw){
        var err= createError(400,'Please enter your old password');
        throw err;
    }

    if(!newPasw){
        var err=createError(400,'Please enter your new pass');
        throw err;
    }

    if(!confirmNewPasw){
        var err = createError(400,'Please enter again your new pass in order to confirm it');
        throw err;
    }

    var checkOldPasw = await client.query(queryBuilder.checkOldPassword(),[user_id]);

        if(checkOldPasw.rowCount==0){
            var err=createError(404,'User not found');
            throw err;
        }

        var hashOldPasw = crypto.createHash('sha256').update(oldPasw).digest('base64');
        if(checkOldPasw.rows[0].pass!=hashOldPasw) {
            var err=createError(400,'Please enter your VALID old password');
            throw err;
        }

        if(newPasw==confirmNewPasw){
            var hash = crypto.createHash('sha256').update(newPasw).digest('base64');
            var result = await client.query(queryBuilder.setNewPassword(),[hash,user_id]);
            return result.rows[0];
        } else {
            var err=createError(400,'Your new password and confirmation pasw do not match');
            throw err;
        }



}