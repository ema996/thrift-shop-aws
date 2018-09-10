require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token.js');
const db = require('./database-helper.js')


exports.handler = async (event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try{
        var data = await getProductsByProductId(event);
        callback(null,data)
    } catch (err) {
        const error= {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    }
}

async function getProductsByProductId(event){
    console.log('Ova e eventot: ',event);
    const client = await db.pool.connect();
    var product_id = event.params.path.id;
    
  
    console.log('Stigna do product_id i ova e product id: ',product_id);
    var result = await client.query(queryBuilder.getProductById(),[product_id]);
    console.log('Ova e rezultat od query-to: ',result);
    
    if(result.rowCount==0){
        var err=createError(404,'Product does not exist');
        throw err;
    }

    if(!result) {
        var err = createError(500,'There is na error');
        throw err;
    }

    return result.rows[0];
    }