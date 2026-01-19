import dotenv from "dotenv";
import config from "../../../packages/config/src/index.config.ts";
import logger from "../../../packages/utils/src/logger.util.ts";
import { createApp } from "./app";

const startServer = async () => {
	const now = Date.now();
	dotenv.config();
	const app = await createApp();

	app.listen(config[config.env].port, () => {
		logger.info(
			{
				msg: `Server started on port ${config[config.env].port}`,
				duration: `${(Date.now() - now) / 1000}s`,
			},
			"SERVER_START",
		);
	});
};

startServer();
