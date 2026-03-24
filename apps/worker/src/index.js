import "../path-register.js";
import dotenv from "dotenv";
import { BULL_QUEUE_NAMES } from "../../../packages/utils/src/constants.util.ts";
import { queueServices } from "./queue/queue.service";
import QueueWorkersHandler from "./queue/queueWorkers.handler";

const now = Date.now();
dotenv.config();

// Starting the workers handlers
new QueueWorkersHandler(BULL_QUEUE_NAMES.DEFAULT);
new QueueWorkersHandler(BULL_QUEUE_NAMES.IMAGE_OPTIMIZATION);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_RECOGNITION);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_SEARCH);
new QueueWorkersHandler(BULL_QUEUE_NAMES.FACE_CLUSTERING);

console.log(`
    SERVER_START - Worker Server started successfully
    duration: ${(Date.now() - now) / 1000}s
`);

export { queueServices };
