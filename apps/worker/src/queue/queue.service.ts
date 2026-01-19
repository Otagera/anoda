import { Queue } from "bullmq";
import { BULL_QUEUE_NAMES } from "../../../../packages/utils/src/constants.util.ts";
import redisClient from "../../../../packages/utils/src/redisClient.util.ts";

export const queueConnectionConfig = { connection: redisClient };

// The queues
const defaultQueue = new Queue(BULL_QUEUE_NAMES.DEFAULT, queueConnectionConfig);
const faceRecognitionQueue = new Queue(
	BULL_QUEUE_NAMES.FACE_RECOGNITION,
	queueConnectionConfig,
);
const faceSearchQueue = new Queue(
	BULL_QUEUE_NAMES.FACE_SEARCH,
	queueConnectionConfig,
);

// The lib that contain adding the job and getting the queue
export class QueueLib {
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

export const queueServices = new QueueServices();
