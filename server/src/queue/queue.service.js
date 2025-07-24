const { Queue } = require("bullmq");
const { BULL_QUEUE_NAMES } = require("@utils/constants.util");
const config = require("@config/index.config");
const redisClient = require("@utils/redisClient.util");

const queueConnectionConfig = { connection: redisClient };

// The queues
const defaultQueue = new Queue(BULL_QUEUE_NAMES.DEFAULT, queueConnectionConfig);

// The lib that contain adding the job and getting the queue
class QueueLib {
  _queue;
  constructor(queue) {
    this._queue = queue;
  }

  async addJob(queueName, data, options) {
    await this._queue.add(queueName, data, options);
    return;
  }
  getQueue() {
    return this._queue;
  }
}

class QueueServices {
  defaultQueueLib;
  faceRecognitionQueueLib;
  faceSearchQueueLib;

  constructor() {
    this.defaultQueueLib = new QueueLib(defaultQueue);
    this.faceRecognitionQueueLib = new QueueLib(faceRecognitionQueue);
    this.faceSearchQueueLib = new QueueLib(faceSearchQueue);
  }
}

const queueServices = new QueueServices();

module.exports = { queueConnectionConfig, QueueLib, queueServices };
