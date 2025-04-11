const request = require("supertest");
const url = require("url");
const { app } = require("../app");
const { Albums, Images, Users } = require("@models/index.model");
const loggerUtil = require("@utils/logger.util");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const baseURL = "/api/v1";
const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const now = Date.now();

const closeServerAsync = (serverInstance) => {
  return new Promise((resolve, reject) => {
    // Check if server is actually running before trying to close
    if (serverInstance && serverInstance.listening) {
      serverInstance.close((err) => {
        if (err) {
          console.error("Error closing server:", err);
          reject(err); // Reject the promise on error
        } else {
          console.log("Server closed successfully.");
          resolve(); // Resolve the promise on success
        }
      });
    } else {
      console.warn("Server was not running or already closed.");
      resolve(); // Resolve if server wasn't running
    }
  });
};

const server = app.listen(0, () => {
  loggerUtil.info(
    {
      msg: `Server started on port ${server.address().port}`,
      duration: `${(Date.now() - now) / 1000}s`,
    },
    "SERVER_START"
  );
});

module.exports = {
  app,
  url,
  baseURL,
  request,
  server,
  sleep,
  Albums,
  Images,
  Users,
  closeServerAsync,
  HTTP_STATUS_CODES,
};
