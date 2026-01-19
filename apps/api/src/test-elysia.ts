import { Elysia } from "elysia";

console.log("Starting minimal server...");

const app = new Elysia().get("/", () => "Minimal Server Running").listen(3006);

console.log(
	`Minimal server running at ${app.server?.hostname}:${app.server?.port}`,
);
