require ('dotenv').config();
const createError = require('http-errors');
const queryBuilder = require ('./queryBuilder.js');
const crypto = require('crypto');
const generateToken = require('./token');
const db = require('./database-helper.js');
const multipart = require('parse-multipart');

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
    
    
    const client = await db.pool.connect();
    var imageUrl = event.body.imageUrl;
    console.log('Linkot od slikata: ',imageUrl);
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

    if(!imageUrl){
        var err=createError(400,'Please upload a file');
        throw err;
    }

    var queryResult = await client.query(queryBuilder.createProduct(),[product_name, price, category, imageUrl, description, user_id]);
    console.log('Rezultatot od query-to e: ',queryResult);
    return queryResult.rows;
}

// 'use strict'

// const AWS = require('aws-sdk');
// const s3 = new AWS.S3();
// const moment = require ('moment');
// const fileType = require('file-type');

// require ('dotenv').config();
// const createError = require('http-errors');
// const queryBuilder = require ('./queryBuilder.js');
// const crypto = require('crypto');
// const generateToken = require('./token');
// const db = require('./database-helper.js');
// const multipart = require('parse-multipart');

// exports.handler = async (event,context,callback) => {
//     var request = event['body-json'].image;
//     var base64String = request.base64String;
//     var buffer = new Buffer(base64String, 'base64');
//     var fileMime = fileType(buffer);

//     if(fileMime === null) {
//         return context.fail('The string supplied is not a file type');
//     }

//     var file = getFile(fileMime, buffer);
//     var params = file.params;

//     s3.putObject(params, function(err,data) {
//         if(err){
//             return console.log(err);
//         }

//         return console.log('File URL', file.full_path);
//     })


//     var getFile = function(fileMime,buffer) {
//         var fileExt = fileMime.ext;
//         var hash = sha1(new Buffer(new Date().toString()));
//         var now= moment().format('YYYY-MM-DD HH:mm:ss');

//         var filePath = hash + '/';
//         var fileName = unixTime(now) + '.'+fileExt;
//         var fileFullName = filePath +fileName;
//         var fileFullPath = 'Your bucket path'+fileFullName;

//         var params ={
//             Bucket: 'products.images',
//             Key: 'thisIsKey',
//             Body: buffer
//         };

//         var uploadFile = {
//             size: buffer.toString('ascii').length,
//             type: fileMime.mime,
//             name: fileName,
//             full_path: fileFullPath
//         }

//         return {
//             'params' : params,
//             'uploadFile' : uploadFile
//         }
//     }
// }



