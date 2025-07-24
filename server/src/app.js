const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { spawn } = require("child_process");
const dotenv = require("dotenv");
const { MulterError } = require("multer");
const { createBullBoard } = require("@bull-board/api");
const { BullMQAdapter } = require("@bull-board/api/bullMQAdapter");
const { ExpressAdapter } = require("@bull-board/express");

const logger = require("@utils/logger.util");
const router = require("@routes/index.route");
const upload = require("@routes/middleware/multer.middleware");
const limiter = require("@utils/rateLimiter.util");
const config = require("@config/index.config");
const { HTTP_STATUS_CODES } = require("@utils/constants.util");
const { queueServices } = require("@queue/queue.service");

dotenv.config();
const app = express();

// For dashboard to virtually see queues and jobs
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/worker/admin");
createBullBoard({
  queues: [new BullMQAdapter(queueServices.defaultQueueLib.getQueue())],
  serverAdapter: serverAdapter,
});

// To make sure /worker/admin points to the bull queue dashboard
app.use("/worker/admin", serverAdapter.getRouter());

app.use(cors());
app.use(logger.httpLoggerInstance);
app.use(bodyParser.json());
app.use((req, res, next) => {
  if (config.env === "test" || "development") {
    next();
  } else {
    limiter(req, res, next);
  }
});
app.use(bodyParser.urlencoded({ extended: true }));

app.set("base", "/api/v1");
app.use("/api/v1", router);

app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.send("Face Search Backend is running!");
});

// API endpoint for face search (to be implemented)
app.post("/api/search", async (req, res) => {
  const { faceId, albumId } = req.body;

  if (!faceId) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "faceId is required" });
  }

  try {
    await queueServices.faceSearchQueueLib.addJob(
      "faceSearch",
      { faceId, albumId },
      { removeOnComplete: true, removeOnFail: true }
    );
    return res.status(HTTP_STATUS_CODES.OK).json({ message: "Face search job enqueued." });
  } catch (error) {
    console.error("Error enqueuing face search job:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Failed to enqueue face search job." });
  }
});

app.use(function (err, req, res, _next) {
  if (err instanceof MulterError) {
    return res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({
      status: "error",
      message: err?.message ? err.message : "File size too large max 5MB",
      data: err,
    });
  }
  logger.error(
    {
      msg: err.stack,
    },
    "INTERNAL_SERVER_ERROR"
  );
  return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send({
    status: "error",
    message: "Internal server error",
    data: null,
  });
});

app.use(function (req, res, _next) {
  return res.status(HTTP_STATUS_CODES.NOTFOUND).send({
    status: "error",
    message: "Resource not found",
    data: null,
  });
});

module.exports = { app };
