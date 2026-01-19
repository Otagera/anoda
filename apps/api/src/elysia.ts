import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";

console.log("Initializing Elysia server...");

const start = async () => {
  try {
    const { default: albumsRoutes } = await import("./routes/albums.route");
    const { default: authRoutes } = await import("./routes/auth.route");
    const { default: picturesRoutes } = await import("./routes/pictures.route");

    const app = new Elysia()
      // .use(swagger())
      .use(authRoutes)
      .use(albumsRoutes)
      .use(picturesRoutes)
      .get("/", () => "Face Search Backend is running with Elysia!")
      .listen(3005);

    console.log(
      `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
    );
    return app;
  } catch (error) {
    console.error("Failed to start Elysia server:", error);
    process.exit(1);
  }
};

const app = await start();

export default app;
