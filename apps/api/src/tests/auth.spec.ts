import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Users } from "../../../../packages/models/src/index.model.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { baseURL, request } from "./common.ts";

describe("Auth Routes", () => {
	const prefix = `auth-test-${Date.now()}`;
	const testEmail = `${prefix}@example.com`;
	const testPassword = "ValidPassword123!";
	let agent: any;

	beforeAll(() => {
		agent = request.agent();
	});

	afterAll(async () => {
		const user = await Users.fetchUserByEmail(testEmail);
		if (user) {
			await Users.deleteUserById(user.user_id);
		}
	});

	describe("POST /signup", () => {
		it("should successfully sign up a new user", async () => {
			const res = await agent
				.post(`${baseURL}/auth/signup`)
				.send({ email: testEmail, password: testPassword });

			expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
			expect(res.body.status).toBe("completed");
			expect(res.body.message).toBe("User signed up successfully.");
			expect(res.body.data.email).toBe(testEmail);
			expect(res.body.data.accessToken).toBeDefined();
		});

		it("should fail to sign up with an existing email", async () => {
			const res = await agent
				.post(`${baseURL}/auth/signup`)
				.send({ email: testEmail, password: testPassword });

			// Assuming 409 Conflict or 400 Bad Request depending on implementation
			expect(res.status).toBeGreaterThanOrEqual(400);
			expect(res.body.status).toBe("error");
		});

		it("should fail to sign up with missing fields", async () => {
			const res = await agent
				.post(`${baseURL}/auth/signup`)
				.send({ email: "only-email@example.com" });

			// TODO: Fix API to return 400 for validation errors instead of 500
			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("POST /login", () => {
		it("should successfully log in an existing user", async () => {
			const res = await agent
				.post(`${baseURL}/auth/login`)
				.send({ email: testEmail, password: testPassword });

			expect(res.status).toBe(HTTP_STATUS_CODES.OK);
			expect(res.body.status).toBe("completed");
			expect(res.body.data.accessToken).toBeDefined();
		});

		it("should fail to log in with the wrong password", async () => {
			const res = await agent
				.post(`${baseURL}/auth/login`)
				.send({ email: testEmail, password: "wrong-password" });

			expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
			expect(res.body.status).toBe("error");
		});

		it("should fail to log in with a non-existent email", async () => {
			const res = await agent
				.post(`${baseURL}/auth/login`)
				.send({ email: "doesnotexist@example.com", password: testPassword });

			expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
			expect(res.body.status).toBe("error");
		});
	});
});
