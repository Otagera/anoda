const config = require("./index.config");
const { Pool } = require("pg");

const pool = new Pool({
  user: config[config.env].db_user,
  host: config[config.env].db_host,
  database: config[config.env].database,
  password: config[config.env].db_password,
  port: 5432, // Default PostgreSQL port
});
module.exports = pool;
