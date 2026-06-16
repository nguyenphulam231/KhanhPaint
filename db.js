const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "ngphlam2310",
  database: "khanhpaintdealerdatabase",
});

module.exports = connection.promise();
