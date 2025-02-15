"use strict";
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();
const config = {
  env: process.env.NODE_ENV || "development",
  app_name: process.env.APP_NAME || "Anoda Facematch",
  development: {
    // DB
    db_user: process.env.PG_USERNAME,
    db_host: process.env.PG_HOSTNAME,
    database: process.env.PG_DATABASE, // Choose a database name
    db_password: process.env.PG_PASSWORD,
    db_port: 5432,
    db_url: `${process.env.DB_URL}${process.env.DB_NAME}`,
    base_api_url: process.env.BASE_API_URL || "http://localhost",
    port: process.env.PORT || 5001,
    secret: process.env.SESSION_SECRET,

    // Redis
    redis_port: process.env.REDIS_PORT, // Redis port
    redis_host: process.env.REDIS_HOSTNAME, // Redis host
    redis_username: process.env.REDIS_USERNAME || "default", // needs Redis >= 6
    redis_password: process.env.REDIS_PASSWORD || "",
    redis_url: process.env.REDIS_URL,

    // chatterbox
    chatterbox_log_file: process.env.LOG_FILE || "logQueue.json",
    chatterbox_retry_delay: process.env.RETRY_DELAY_MS || 10000,
    chatterbox_max_bulk_log: process.env.MAX_BULK_LOG || 10,
    chatterbox_api_url:
      process.env.CHATTERBOX_API_URL || "http://localhost:3005",
    chatterbox_app_name: process.env.CHATTERBOX_APP_NAME || "anoda",
    chatterbox_api_secret: process.env.CHATTERBOX_API_SECRET,

    // python
    python_interpreter_path: path.join(
      __dirname,
      "..",
      "..",
      "..",
      "venv",
      "bin",
      "python"
    ),
  },
  test: {
    db_url: `${process.env.TEST_DB_URL}${process.env.TEST_DB_NAME}`,
    base_api_url: process.env.TEST_BASE_API_URL || "http://localhost",
    port: process.env.TEST_PORT || 5001,
    secret: process.env.TEST_SESSION_SECRET,
    redis_port: process.env.TEST_REDIS_PORT, // Redis port
    redis_host: process.env.TEST_REDIS_HOSTNAME, // Redis host
    redis_username: process.env.TEST_REDIS_USERNAME || "default", // needs Redis >= 6
    redis_password: process.env.TEST_REDIS_PASSWORD || "",
    redis_url: process.env.TEST_REDIS_URL,
  },
  production: {
    db_url: process.env.DB_URL,
    base_api_url:
      process.env.BASE_API_URL || "https://entryboost-server-node.onrender.com",
    port: process.env.PORT || 5001,
    secret: process.env.SESSION_SECRET,
    redis_port: process.env.REDIS_PORT, // Redis port
    redis_host: process.env.REDIS_HOSTNAME, // Redis host
    redis_username: process.env.REDIS_USERNAME || "default", // needs Redis >= 6
    redis_password: process.env.REDIS_PASSWORD || "",
    redis_url: process.env.REDIS_URL,

    // chatterbox
    chatterbox_log_file: process.env.LOG_FILE || "logQueue.json",
    chatterbox_retry_delay: process.env.RETRY_DELAY_MS || 10000,
    chatterbox_max_bulk_log: process.env.MAX_BULK_LOG || 10,
    chatterbox_api_url:
      process.env.CHATTERBOX_API_URL || "http://localhost:3005",
    chatterbox_app_name: process.env.CHATTERBOX_APP_NAME || "anoda",
    chatterbox_api_secret: process.env.CHATTERBOX_API_SECRET,
  },
};
module.exports = config;
