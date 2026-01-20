import { beforeAll, describe, expect, it } from "bun:test";
import { createElysiaApp } from "../elysia.ts";

let app: any;

describe("Elysia API", () => {
	beforeAll(async () => {
		app = await createElysiaApp();
	});

	it("should return 200 on root path", async () => {
		const response = await app.handle(new Request("http://localhost/"));
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).toBe("Face Search Backend is running with Elysia!");
	});

	it("should return a 422 on invalid signup body", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/v1/auth/signup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: "test@example.com",
					// missing password
					message: 123,
				}),
			}),
		);

		expect(response.status).toBe(400);
	});

	it("should return 404 for unknown routes", async () => {
		const response = await app.handle(new Request("http://localhost/unknown"));
		expect(response.status).toBe(404);
	});
});
