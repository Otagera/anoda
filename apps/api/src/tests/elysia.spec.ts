import { describe, expect, it } from "bun:test";
import { Elysia, t } from "elysia";

const app = new Elysia().post("/json", ({ body }) => body, {
	body: t.Object({
		message: t.String(),
	}),
});

describe("Elysia", () => {
	it("should parse JSON body correctly", async () => {
		const response = await app.handle(
			new Request("http://localhost/json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: "Hello, Elysia!",
				}),
			}),
		);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual({
			message: "Hello, Elysia!",
		});
	});

	it("should return a 400 on invalid JSON body", async () => {
		const response = await app.handle(
			new Request("http://localhost/json", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					message: 123,
				}),
			}),
		);

		expect(response.status).toBe(400);
	});
});
