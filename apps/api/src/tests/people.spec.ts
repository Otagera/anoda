import { beforeAll, describe, expect, it } from "bun:test";
import { createElysiaApp } from "../elysia.ts";

let app: any;
let authToken: string;

describe("People API", () => {
	beforeAll(async () => {
		console.log("Creating app...");
		app = await createElysiaApp();

		// Create user and login to get token
		const email = `test.people.${Date.now()}@example.com`;
		const password = "Password123!";

		console.log("Signing up...");
		const signupRes = await app.handle(
			new Request("http://localhost/api/v1/auth/signup", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			}),
		);
		console.log("Signup status:", signupRes.status);
		if (signupRes.status !== 201 && signupRes.status !== 200) {
			console.error("Signup failed:", await signupRes.text());
		}

		console.log("Logging in...");
		const loginRes = await app.handle(
			new Request("http://localhost/api/v1/auth/login", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, password }),
			}),
		);
		console.log("Login status:", loginRes.status);

		const loginData = await loginRes.json();
		authToken = loginData.data.accessToken;
		console.log("Auth token obtained");
	});

	it("should create a person", async () => {
		const response = await app.handle(
			new Request("http://localhost/api/v1/people", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${authToken}`,
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
		const response = await app.handle(
			new Request("http://localhost/api/v1/people", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${authToken}`,
				},
			}),
		);

		expect(response.status).toBe(200);
		const json = await response.json();
		expect(Array.isArray(json.data)).toBe(true);
		expect(json.data.length).toBeGreaterThan(0);
	});
});
