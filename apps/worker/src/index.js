import "../path-register.js";
import express from "express";
import dotenv from "dotenv";
import config from "../../../packages/config/src/index.config.ts";
import QueueWorkersHandler from "./queue/queueWorkers.handler";
import { BULL_QUEUE_NAMES } from "../../../packages/utils/src/constants.util.ts";
import { queueServices } from "./queue/queue.service";

const now = Date.now();
dotenv.config();

const app = express();

// Starting the workers handlers
new QueueWorkersHandler(BULL_QUEUE_NAMES.DEFAULT);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_RECOGNITION);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_SEARCH);

app.listen(config[config.env].worker_port, () => {
	console.log(`
    SERVER_START - Worker Server started on port ${config[config.env].worker_port}
    duration: ${(Date.now() - now) / 1000}s
  `);
});

export { queueServices };
