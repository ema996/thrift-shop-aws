require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token');
const db = require('./db.js');
const multipart = require('parse-multipart');
const AWS = require('aws-sdk');
var s3 = new AWS.S3({region: "eu-central-1"});


exports.handler = async(event,context,callback) => {
    context.callbackWaitsForEmptyEventLoop = false;
    try {
        var data = await createProduct(event);
        callback(null,data)
    } catch (err) {
        const error = {
            status: err.status || 500,
            message: err.message || "Internal server error."
        }
        callback(JSON.stringify(error));
    } 
}

async function createProduct(event) {
    console.log(event);
    var product_name = event.body.product_name;
    console.log('Imeto na produktot: ',product_name)
    var price = event.body.price;
    console.log('Cenata e: ',price);
    var category = event.body.category;
    console.log('Kategorija: ',category);
    var description = event.body.description;
    var user_id = event.context.userId;
    console.log('Id-to na user-ot e: ',user_id);

    
   
    
    if(!product_name) {
        var err=createError(400,'Please enter a product name');
        throw err;
    }

    if(!price) {
        var err=createError(400,'Please enter a price');
        throw err;
    }

    if(!category) {
        var err=createError(400,'Please enter a category');
        throw err;
    }


   
   function formatDate(date) {
  var monthNames = [
    "January", "February", "March",
    "April", "May", "June", "July",
    "August", "September", "October",
    "November", "December"
  ];

  var day = date.getDate();
  var monthIndex = date.getMonth();
  var year = date.getFullYear();
  var min = date.getMinutes();
  var sec=date.getSeconds();
  var hours = date.getHours();

  return day + '_' + monthNames[monthIndex] + '_' + year+'_'+hours+'_'+min+'_'+sec;
}

var dateNow = formatDate(new Date());  
   
   
    const signedUrlExpireSeconds = 60 * 100;
    var keyName = user_id+'/'+'image_'+dateNow+'.jpg';
    var filePath = 'https://s3.eu-central-1.amazonaws.com/products.images/'+ keyName;
    
    var params = {Bucket: "products.images", Key: keyName};
    var url = await getSignedUrlAsync(params);
    console.log('Ova e url-to: ',url);
    var queryResult = await db.query(queryBuilder.createProduct(),[product_name, price, category, filePath, description, user_id]);
    console.log('Rezultatot od query-to e: ',queryResult);
    return {"queryResult: ":queryResult.rows[0],
            "url": url
    };
}

async function getSignedUrlAsync(params){
    return new Promise(function(resolve,reject){
        s3.getSignedUrl('putObject',params, function(err,data) {
            if(err){
                console.log('Error uploading data', err);
                reject(err);
            } else{
                resolve(data);
            }
        });
    });
}


