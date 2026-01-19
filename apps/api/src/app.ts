import path from "node:path";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MulterError } from "multer";
import config from "../../../packages/config/src/index.config.ts";
import { HTTP_STATUS_CODES } from "../../../packages/utils/src/constants.util.ts";
import logger from "../../../packages/utils/src/logger.util.ts";
import limiter from "../../../packages/utils/src/rateLimiter.util.ts";
import { queueServices } from "../../worker/src/index.js";
import getRouter from "./routes/index.route";

const createApp = async () => {
	dotenv.config();
	const app = express();

	// For dashboard to virtually see queues and jobs
	const serverAdapter = new ExpressAdapter();
	serverAdapter.setBasePath("/worker/admin");
	createBullBoard({
		queues: [
			new BullMQAdapter(queueServices.defaultQueueLib.getQueue()),
			new BullMQAdapter(queueServices.faceRecognitionQueueLib.getQueue()),
			new BullMQAdapter(queueServices.faceSearchQueueLib.getQueue()),
		],
		serverAdapter: serverAdapter,
	});

	// To make sure /worker/admin points to the bull queue dashboard
	app.use("/worker/admin", serverAdapter.getRouter());

	app.use(cors());
	app.use(logger.httpLoggerInstance);
	app.use(bodyParser.json());
	app.use((req, res, next) => {
		if (config.env === "test" || config.env === "development") {
			next();
		} else {
			limiter(req, res, next);
		}
	});
	app.use(bodyParser.urlencoded({ extended: true }));

	app.set("base", "/api/v1");
	const router = await getRouter();
	app.use("/api/v1", router);

	const __dirname = path.dirname(new URL(import.meta.url).pathname);
	app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

	app.get("/", (_req, res) => {
		res.send("Face Search Backend is running!");
	});

	app.use((err, _req, res) => {
		if (err instanceof MulterError) {
			return res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({
				status: "error",
				message: err.message,
				data: null,
			});
		}
		return res.status(err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST).send({
			status: "error",
			message: err?.message || "Internal server error",
			data: null,
		});
	});

	app.use((_req, res) =>
		res.status(HTTP_STATUS_CODES.NOTFOUND).send({
			status: "error",
			message: "Resource not found",
			data: null,
		}),
	);

	return app;
};

export { createApp };
