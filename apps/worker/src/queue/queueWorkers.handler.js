import { Worker } from "bullmq";
import fs from "fs";
import path from "path";
import logger from "../../../../packages/utils/src/logger.util.ts";
import { queueConnectionConfig } from "./queue.service";

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
		logger.info([this._queueName, job], `JOB-WORKER-COMPLETED-${job?.id}`);
		console.log(
			`Worker: ${this._queueName} - Job ${job.id} has completed with result ${job.returnvalue}`,
		);
	}

	onFailed(job, error) {
		logger.error([this._queueName, job, error], `JOB-WORKER-ERROR-${job?.id}`);
		console.log(`Worker: ${this._queueName} - Job ${job?.id} has failed.`);
	}

	async process(job) {
		logger.log(
			[this._queueName, job],
			`JOB-WORKER-PROCESSED-COMPLETED-${job?.id}`,
		);
		console.log(
			`Processing job ${job.id} with bull worker ${job.data.worker}.`,
		);
		try {
			const handlersFilePath = path.join(import.meta.dir, "workers");
			const handlers = fs.readdirSync(handlersFilePath);

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
			console.log(error);
		}
	}
}

export default WorkersHandler;
