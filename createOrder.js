require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./database-helper.js');

exports.handler = async(event,context,callback) => {
    console.log('Ova e eventot kaj handler-ot: ', event);
    context.callbackWaitsForEmptyEventLoop = false;
    try{
        var data = await createOrder(event);
        callback(null,data)
    } catch (err) {
        const error= {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    }
}

async function createOrder (event) {
    console.log('Ova e eventot: ',event);
    const client = await db.pool.connect();
    var product_id = event.body.product_id;
    console.log('Ova e id-to na produktot: ',product_id);
    var user_id= event.context.userId;
    console.log('Ova e id-to na userot: ',user_id);

    if(!product_id){
        var err=createError(400,'Please choose some item');
        throw err;
    }

    var balanceQuery= await client.query(queryBuilder.checkBalance(),[user_id]);
    var balance=balanceQuery.rows[0].balance;
    console.log('Userot ima tolku pari: ',balance);
    var priceAndOwnerIdQuery = await client.query(queryBuilder.checkingPriceAndOwnerId(), [product_id]);
    console.log('Ova e priceAndOwnerIdQuery :  ',priceAndOwnerIdQuery);

    if(priceAndOwnerIdQuery.rowCount ==0){
        var err=createError(404,'Product does not exist.');
        throw err;
    }
    
    if(priceAndOwnerIdQuery.rows[0].available == false){
        var err=createError(409,'Product is not available.');
        throw err; }
    
   
    console.log('Ova treba da ja vrati cenata i user_id  ',priceAndOwnerIdQuery.rows[0]);
    var price= priceAndOwnerIdQuery.rows[0].price;
    var ownerId = priceAndOwnerIdQuery.rows[0].user_id;
    if(user_id == ownerId) {
        var err = createError(409,'You can not buy your own product');
        throw err;
    }
    var orderQuery = await client.query(queryBuilder.createOrder(),[price,user_id,ownerId,product_id]);
    console.log('Rezultatot od poslednoto query(transakcijata): ',orderQuery);

    return orderQuery.rows;
}