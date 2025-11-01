require('dotenv').config();
const mysql = require('mysql2/promise'); // usa la versión con promesas

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: process.env.MYSQL_PORT || 3306,
  connectionLimit: 4,
  ssl: { rejectUnauthorized: false }
});


module.exports = pool;