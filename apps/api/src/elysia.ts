import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ElysiaAdapter } from "@bull-board/elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { swagger } from "@elysiajs/swagger";
import { Elysia, sse } from "elysia";
import config from "../../../packages/config/src/index.config.ts";
import { AuthError } from "../../../packages/utils/src/error.util.ts";
import {
	EVENTS,
	eventEmitter,
} from "../../../packages/utils/src/events.util.ts";
import { queueServices } from "../../worker/src/queue/queue.service.ts";

export const createElysiaApp = async () => {
	const { default: albumsRoutes } = await import("./routes/albums.route");
	const { default: authRoutes } = await import("./routes/auth.route");
	const { default: picturesRoutes } = await import("./routes/pictures.route");
	const { default: facesRoutes } = await import("./routes/faces.route");
	const { default: publicRoutes } = await import("./routes/public.route");
	const { default: peopleRoutes } = await import("./routes/people.route");

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
			],
			serverAdapter: serverAdapter,
		});

		bullBoardPlugin = await serverAdapter.registerPlugin();
	}

	eventEmitter.setMaxListeners(100);

	const app = new Elysia({
		bodyLimit: 500 * 1024 * 1024, // 500MB limit for bulk uploads
	})
		.onBeforeHandle(({ request, body }) => {
			console.log(
				`[${new Date().toISOString()}] ${request.method} ${request.url}`,
			);
			if (body && request.url.includes("/auth/signup")) {
				const debugBody = { ...(body as any) };
				if (debugBody.password) debugBody.password = "***";
				console.log("Request Body:", debugBody);
			}
		})
		.onAfterHandle(({ request, set }) => {
			if (set.status >= 400) {
				console.log(`[${set.status}] ${request.method} ${request.url}`);
			}
		})
		.use(cors())
		.use(staticPlugin({ assets: "src/uploads", prefix: "/api/uploads" }));

	if (bullBoardPlugin) {
		app.use(bullBoardPlugin);
	}

	app
		.use(swagger())
		.error({
			AUTH_ERROR: AuthError,
		})
		.onError(({ code, error, set, request }) => {
			console.error(`!!! Elysia Error Catch !!!`);
			console.error(`Route: ${request.method} ${request.url}`);
			console.error(`Code: ${code}`);
			console.error(`Error Name: ${error.name}`);
			console.error(`Error Message: ${error.message}`);
			if (error.stack) {
				console.error("Stack Trace:");
				console.error(error.stack);
			} else {
				console.error("No stack trace available for this error.");
				console.error("Error Object:", error);
			}

			if (code === "AUTH_ERROR" || error instanceof AuthError) {
				set.status = 401;
				return {
					status: "error",
					message: error.message,
					data: null,
				};
			}

			if (code === "VALIDATION") {
				set.status = 400;
				return {
					status: "error",
					message: error.message,
					data: null,
				};
			}

			if (code === "NOT_FOUND") {
				set.status = 404;
				return {
					status: "error",
					message: "Not Found",
					data: null,
				};
			}

			const statusCode =
				(error as any).statusCode || (error as any).status || 500;
			set.status = statusCode;

			return {
				status: "error",
				message: error.message || "Internal server error",
				data: null,
			};
		})
		.group("/api/v1", (app) =>
			// Register authPlugin globally for this group
			app
				.use(authRoutes)
				.use(albumsRoutes)
				.use(picturesRoutes)
				.use(facesRoutes)
				.use(publicRoutes)
				.use(peopleRoutes),
		)
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
								} catch (_e) {
									// Controller might be closed
								}
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
					description: "Real-time updates for image processing",
				},
			},
		);

	return app;
};

const start = async () => {
	try {
		console.log("Initializing Elysia server...");
		const app = await createElysiaApp();
		const port = config[config.env].elysia_port || 3005;
		app.listen(port);

		console.log(
			`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
		);
		return app;
	} catch (error) {
		console.error("Failed to start Elysia server:", error);
		process.exit(1);
	}
};

// Only start if this file is run directly (though Bun makes this tricky with imports)
// For now, we'll keep the side effect but export the creator
if (import.meta.main) {
	await start();
}

export default start;
