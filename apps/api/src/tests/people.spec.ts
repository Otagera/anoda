import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { setupTestEnv } from "./test-utils";

let env: Awaited<ReturnType<typeof setupTestEnv>>;

describe("People API", () => {
	beforeAll(async () => {
		env = await setupTestEnv("people");
	});

	afterAll(async () => {
		if (env?.cleanup) {
			await env.cleanup();
		}
	});

	it("should create a person", async () => {
		const response = await env.app.handle(
			new Request("http://localhost/api/v1/people", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${env.authToken}`,
				},
				body: JSON.stringify({ name: "John Doe" }),
			}),
		);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(json.data.name).toBe("John Doe");
		expect(json.data.personId).toBeDefined();
	});

	it("should list people", async () => {
		const response = await env.app.handle(
			new Request("http://localhost/api/v1/people", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${env.authToken}`,
				},
			}),
		);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(Array.isArray(json.data)).toBe(true);
		expect(json.data.length).toBeGreaterThan(0);
	});
});
