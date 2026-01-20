import path from "node:path";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MulterError } from "multer";
import config from "../../../packages/config/src/index.config.ts";
import { HTTP_STATUS_CODES } from "../../../packages/utils/src/constants.util.ts";
import logger from "../../../packages/utils/src/logger.util.ts";
import limiter from "../../../packages/utils/src/rateLimiter.util.ts";
import getRouter from "./routes/index.route";

const createApp = async () => {
	dotenv.config();
	const app = express();

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
		console.error("Global Error Handler:", err); // Added for debugging
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
