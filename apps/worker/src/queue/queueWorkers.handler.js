import fs from "node:fs";
import path from "node:path";
import { Worker } from "bullmq";
import { createServiceLogger } from "../../../../packages/utils/src/logger.util.ts";

const logger = createServiceLogger("worker");

import { queueConnectionConfig } from "./queue.service";

let cachedHandlers;

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
			queueConnectionConfig,
		);

		this._worker.on("completed", (job) => this.onCompleted(job));

		this._worker.on("failed", (job, error) => this.onFailed(job, error));
	}

	onCompleted(job) {
		logger.info(`Job ${job?.id} completed`, {
			queue: this._queueName,
			result: job.returnvalue,
		});
	}

	onFailed(job, error) {
		logger.error(`Job ${job?.id} failed`, {
			queue: this._queueName,
			error: error.message,
		});
	}

	async process(job) {
		logger.info(`Processing job ${job.id}`, {
			queue: this._queueName,
			worker: job.data.worker,
		});
		try {
			const handlersFilePath = path.join(import.meta.dir, "workers");
			if (!cachedHandlers) {
				cachedHandlers = fs.readdirSync(handlersFilePath);
			}
			const handlers = cachedHandlers;

			const workerFile = handlers.find((h) =>
				h.startsWith(`${job.data.worker}.worker.`),
			);

			if (!workerFile) {
				throw new Error(`Sorry invalid worker: ${job.data.worker}`);
			}

			const imported = await import(path.join(handlersFilePath, workerFile));
			if (job.data.worker && imported) {
				const run = imported.default || imported;
				return run(job.data);
			} else {
				throw new Error("Invalid worker sent");
			}
		} catch (error) {
			logger.error(`Job ${job.id} error`, {
				queue: this._queueName,
				error: error.message,
			});
			throw error;
		}
	}
}

export default WorkersHandler;
