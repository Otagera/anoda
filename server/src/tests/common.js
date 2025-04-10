const request = require("supertest");
const url = require("url");
const { app } = require("../app");
const { Images, Users } = require("@models/index.model");
const loggerUtil = require("@utils/logger.util");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");

const baseURL = "/api/v1";
const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const now = Date.now();
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
  Images,
  Users,
  HTTP_STATUS_CODES,
};
