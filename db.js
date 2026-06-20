const mysql = require("mysql2");
const { getEnv } = require("./config/env");

const pool = mysql.createPool({
  host: getEnv("DB_HOST", "localhost"),
  port: Number(getEnv("DB_PORT", "3306")),
  user: getEnv("DB_USER", "root"),
  password: getEnv("DB_PASSWORD", ""),
  database: getEnv("DB_NAME", "khanhpaintdealerdatabase"),
  waitForConnections: true,
  connectionLimit: Number(getEnv("DB_CONNECTION_LIMIT", "10")),
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
});

module.exports = pool.promise();
