import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ElysiaAdapter } from "@bull-board/elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import * as Sentry from "@sentry/bun";
import { Elysia, sse } from "elysia";
import config from "../../../packages/config/src/index.config.ts";
import { AuthError } from "../../../packages/utils/src/error.util.ts";
import {
	EVENTS,
	eventEmitter,
} from "../../../packages/utils/src/events.util.ts";
import { createServiceLogger } from "../../../packages/utils/src/logger.util.ts";
import { queueServices } from "../../worker/src/queue/queue.service.ts";

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	environment: config.env,
	serverName: "api",
});

const logger = createServiceLogger("api");

export const createElysiaApp = async () => {
	const { default: albumsRoutes } = await import("./routes/albums.route");
	const { default: authRoutes } = await import("./routes/auth.route");
	const { picturesRoutes, publicPicturesRoutes } = await import(
		"./routes/pictures.route"
	);
	const { default: facesRoutes } = await import("./routes/faces.route");
	const { default: publicRoutes } = await import("./routes/public.route");
	const { default: peopleRoutes } = await import("./routes/people.route");
	const { default: settingsRoutes } = await import("./routes/settings.route");

	let bullBoardPlugin: any = null;
	if (config.env !== "test") {
		const serverAdapter = new ElysiaAdapter("/worker/admin");

		createBullBoard({
			queues: [
				new BullMQAdapter(queueServices.defaultQueueLib.getQueue()),
				new BullMQAdapter(queueServices.imageOptimizationQueueLib.getQueue()),
				new BullMQAdapter(queueServices.faceRecognitionQueueLib.getQueue()),
				new BullMQAdapter(queueServices.faceSearchQueueLib.getQueue()),
				new BullMQAdapter(queueServices.faceClusteringQueueLib.getQueue()),
				new BullMQAdapter(queueServices.bulkDownloadQueueLib.getQueue()),
				new BullMQAdapter(queueServices.fileDeletionQueueLib.getQueue()),
			],
			serverAdapter: serverAdapter,
		});

		bullBoardPlugin = await serverAdapter.registerPlugin();
	}

	eventEmitter.setMaxListeners(100);

	const app = new Elysia({
		bodyLimit: 10 * 1024 * 1024,
	})
		.onBeforeHandle(({ request, body }) => {
			console.log(
				`[${new Date().toISOString()}] ${request.method} ${request.url}`,
			);
			if (body && request.url.includes("/auth/signup")) {
				const debugBody = { ...(body as any) };
				if (debugBody.password) debugBody.password = "***";
			}
		})
		.onAfterHandle(({ request, set }) => {
			if (set.status && set.status >= 400) {
				const safeUrl = request.url.replace(
					/(\/albums\/|\/images\/)[^/?]+/,
					"$1***",
				);
				console.log(`[${set.status}] ${request.method} ${safeUrl}`);
			}
		})
		.use(
			cors({
				origin:
					config.env === "development"
						? true
						: process.env.CORS_ORIGIN
							? process.env.CORS_ORIGIN.split(",")
							: false,
			}),
		)
		.use(staticPlugin({ assets: "src/uploads", prefix: "/api/uploads" }))
		.get("/", () => "Face Search Backend is running with Elysia!")
		.get(
			"/api/v1/events",
			({ signal, set }) => {
				set.headers["Content-Type"] = "text/event-stream";
				set.headers["Cache-Control"] = "no-cache";
				set.headers.Connection = "keep-alive";

				return sse(
					new ReadableStream({
						start(controller) {
							const handler = (data: any) => {
								try {
									const sseData = `data: ${JSON.stringify(data)}\n\n`;
									controller.enqueue(new TextEncoder().encode(sseData));
								} catch (_e) {}
							};

							eventEmitter.on(EVENTS.IMAGE_PROCESSED, handler);

							const heartbeat = setInterval(() => {
								handler({
									type: "heartbeat",
									timestamp: new Date().toISOString(),
								});
							}, 30000);

							const cleanup = () => {
								clearInterval(heartbeat);
								eventEmitter.off(EVENTS.IMAGE_PROCESSED, handler);
								try {
									controller.close();
								} catch (_e) {}
								console.log("SSE connection cleaned up.");
							};

							if (signal.aborted) {
								cleanup();
							} else {
								signal.addEventListener("abort", cleanup, { once: true });
							}
						},
					}),
				);
			},
			{
				detail: {
					summary: "SSE Events Stream",
					description: "Server-Sent Events stream for real-time updates",
				},
			},
		)
		.group("/api/v1/public", (app) => app.use(publicPicturesRoutes))
		.group("/api/v1", (app) =>
			app
				.use(authRoutes)
				.use(albumsRoutes)
				.use(picturesRoutes)
				.use(facesRoutes)
				.use(publicRoutes)
				.use(peopleRoutes)
				.use(settingsRoutes),
		);

	if (bullBoardPlugin) {
		app.use(bullBoardPlugin);
	}

	app.use(swagger());

	return app;
};

const start = async () => {
	try {
		logger.info("Initializing Elysia server...");
		const app = await createElysiaApp();
		const port = config[config.env].elysia_port || 3005;
		app.listen(port);

		logger.info(
			`Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
		);
		return app;
	} catch (error: any) {
		logger.error("Failed to start Elysia server", {
			error: error.message,
			stack: error.stack,
		});
		process.exit(1);
	}
};

// Only start if this file is run directly (though Bun makes this tricky with imports)
// For now, we'll keep the side effect but export the creator
if (import.meta.main) {
	await start();
}

export default start;
