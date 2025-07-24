const now = Date.now();
const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const logger = require("@utils/logger.util");
const config = require("@config/index.config");
const QueueWorkersHandler = require("@queue/queueWorkers.handler");
const { BULL_QUEUE_NAMES } = require("@utils/constants.util");

const app = express();

// Starting the workers handlers
new QueueWorkersHandler(BULL_QUEUE_NAMES.DEFAULT);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_RECOGNITION);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_SEARCH);

app.listen(config[config.env].worker_port, function () {
  logger.info(
    {
      msg: `Worker Server started on port ${config[config.env].worker_port}`,
      duration: `${(Date.now() - now) / 1000}s`,
    },
    "SERVER_START"
  );
});
