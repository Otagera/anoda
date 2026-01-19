import fs from "node:fs";
import path from "node:path";
import express from "express";
import handlerWrapper from "../../../../packages/utils/src/handler.util.ts";

const router = express.Router();

const mountPaths = async (handlersPath, rootRouter) => {
	const handlers = fs.readdirSync(handlersPath);

	for (const handler of handlers) {
		const stat = fs.lstatSync(`${handlersPath}${path.sep}${handler}`);

		if (stat.isDirectory()) {
			await mountPaths(`${handlersPath}${path.sep}${handler}`, rootRouter);
		} else {
			const handlerObject = await import(
				`${handlersPath}${path.sep}${handler}`
			);
			if (Array.isArray(handlerObject.default.method)) {
				handlerObject.default.method.forEach((method) => {
					rootRouter[method](
						handlerObject.default.path,
						...handlerObject.default.middlewares,
						handlerWrapper(handlerObject.default.handler),
					);
				});
				continue;
			}
			rootRouter[handlerObject.default.method](
				handlerObject.default.path,
				...handlerObject.default.middlewares,
				handlerWrapper(handlerObject.default.handler),
			);
		}
	}

	return rootRouter;
};

export default async () => {
	const __dirname = path.dirname(new URL(import.meta.url).pathname);
	const handlersFilePath = `${__dirname}${path.sep}handlers`;
	return await mountPaths(handlersFilePath, router);
};
