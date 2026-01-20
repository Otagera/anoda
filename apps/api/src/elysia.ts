import { swagger } from "@elysiajs/swagger";
import { Elysia, sse } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ElysiaAdapter } from "@bull-board/elysia";
import { AuthError } from "../../../packages/utils/src/error.util.ts";
import config from "../../../packages/config/src/index.config.ts";
import { queueServices } from "../../worker/src/queue/queue.service.ts";
import {
	eventEmitter,
	EVENTS,
} from "../../../packages/utils/src/events.util.ts";

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
				new BullMQAdapter(queueServices.faceRecognitionQueueLib.getQueue()),
				new BullMQAdapter(queueServices.faceSearchQueueLib.getQueue()),
			],
			serverAdapter: serverAdapter,
		});

		bullBoardPlugin = await serverAdapter.registerPlugin();
	}

	const app = new Elysia()
		.onAfterHandle(({ request, set }) => {
			if (set.status === 500) {
				console.log(`[500] ${request.method} ${request.url}`);
			}
		})
		.use(cors())
		.use(staticPlugin({ assets: "src/uploads", prefix: "/api/uploads" }));

	if (bullBoardPlugin) {
		app.use(bullBoardPlugin);
	}

	app.use(swagger())
		.error({
			AUTH_ERROR: AuthError,
		})
		.onError(({ code, error, set }) => {
			console.error(`Elysia Error [${code}]:`, error);

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

			const statusCode = (error as any).statusCode || (error as any).status || 500;
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
		.get("/api/v1/events", () => {
			return sse((stream) => {
				const handler = (data: any) => {
					stream.send(data);
				};

				eventEmitter.on(EVENTS.IMAGE_PROCESSED, handler);

				// In Elysia, cleanup is often handled via stream.close or automatic detection
				// For now, we remove the incorrect .on('close') which was causing the 500 error
			});
		});

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
