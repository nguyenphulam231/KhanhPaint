try { require("dotenv").config(); } catch (err) { /* dotenv is optional in local demo */ }
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "khanhpaintdealerdatabase",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
});

module.exports = pool.promise();
