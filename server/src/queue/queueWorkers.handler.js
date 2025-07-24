const path = require("path");
const fs = require("fs");
const { Worker } = require("bullmq");
const { queueConnectionConfig } = require("./queue.service");
const logger = require("@utils/logger.util");

// The handler class that is instantiated for each queue, with this handler,
// it runs the worker when the worker server has started.
class WorkersHandler {
  _worker;

  constructor(_queueName) {
    this._queueName = _queueName;
    this._worker = new Worker(
      this._queueName,
      async (job) => {
        return this.process(job);
      },
      queueConnectionConfig
    );

    this._worker.on("completed", (job) => this.onCompleted(job));

    this._worker.on("failed", (job, error) => this.onFailed(job, error));
  }

  onCompleted(job) {
    logger.info([this._queueName, job], `JOB-WORKER-COMPLETED-${job?.id}`);
    console.log(
      `Worker: ${this._queueName} - Job ${job.id} has completed with result ${job.returnvalue}`
    );
  }

  onFailed(job, error) {
    logger.error([this._queueName, job, error], `JOB-WORKER-ERROR-${job?.id}`);
    console.log(`Worker: ${this._queueName} - Job ${job?.id} has failed.`);
  }

  async process(job) {
    logger.log(
      [this._queueName, job],
      `JOB-WORKER-PROCESSED-COMPLETED-${job?.id}`
    );
    console.log(
      `Processing job ${job.id} with bull worker ${job.data.worker}.`
    );
    try {
      const handlersFilePath = `${__dirname}${path.sep}workers`;
      const handlers = fs.readdirSync(handlersFilePath);
      if (!handlers.includes(`${job.data.worker}.worker.js`)) {
        throw new Error("Sorry invalid worker");
      }
      const imported =
        await require(`${handlersFilePath}${path.sep}${job.data.worker}.worker.js`);
      if (job.data.worker && imported) {
        return imported(job.data);
      } else {
        throw new Error("Invalid worker sent");
      }
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = WorkersHandler;
