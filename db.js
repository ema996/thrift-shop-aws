'use strict';

require('dotenv').config();
const pg = require('pg');

let db;
let pool;

/**
 * Connect to the database specified in dbProperties.
 * @param {*} dbProperties 
 */
function getDb(dbProperties) {
  if (db) {
    return db;
  }

  const connection = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    idleTimeoutMillis: 10
  };
  db = new pg.Pool(connection);
  return db;
}


/**
 * Execute the query with optional query parameters.
 * @param {string} q 
 * @param {array of *} params 
 */
async function query(q, params) {
    if(!pool) {
        pool = getDb(process.env);
    }
    const client = await pool.connect();
    let result;
    try {
        await client.query('BEGIN');
        result = await client.query(q, params);
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
    return result;
}




module.exports = {
  getDb,
  query
};