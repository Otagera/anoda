import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { baseURL, request } from "./common.ts";
import { setupTestEnv } from "./test-utils.ts";

describe("Pictures Routes", () => {
	let testEnv: any;
	let agent: any;

	beforeAll(async () => {
		testEnv = await setupTestEnv("pictures-test");
		agent = request.agent();
	});

	afterAll(async () => {
		await testEnv.cleanup();
	});

	describe("GET /images", () => {
		it("should successfully retrieve images for the user", async () => {
			const res = await agent
				.get(`${baseURL}/images`)
				.set("Authorization", `Bearer ${testEnv.authToken}`);

			expect(res.status).toBe(HTTP_STATUS_CODES.OK);
			expect(res.body.status).toBe("completed");
			expect(Array.isArray(res.body.data.images)).toBe(true);
		});

		it("should fail to retrieve images without authentication", async () => {
			const res = await agent.get(`${baseURL}/images`);
			expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
		});
	});

	describe("POST /images/presigned-url", () => {
		it("should generate a presigned URL for a new image", async () => {
			const res = await agent
				.post(`${baseURL}/images/presigned-url`)
				.set("Authorization", `Bearer ${testEnv.authToken}`)
				.send({
					fileName: "test-image.jpg",
					contentType: "image/jpeg",
				});

			expect(res.status).toBe(HTTP_STATUS_CODES.OK);
			expect(res.body.status).toBe("completed");
			expect(res.body.data.uploadUrl).toBeDefined();
			expect(res.body.data.key).toBeDefined();
		});

		it("should fail to generate presigned URL with missing fields", async () => {
			const res = await agent
				.post(`${baseURL}/images/presigned-url`)
				.set("Authorization", `Bearer ${testEnv.authToken}`)
				.send({
					fileName: "test-image.jpg",
				});

			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});

	describe("GET /images/:imageId", () => {
		it("should return 404 for a non-existent image (valid UUID)", async () => {
			const validNonExistentUuid = "00000000-0000-0000-0000-000000000000";
			const res = await agent
				.get(`${baseURL}/images/${validNonExistentUuid}`)
				.set("Authorization", `Bearer ${testEnv.authToken}`);

			expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
		});

		it("should return 400 for an invalid image ID format", async () => {
			const res = await agent
				.get(`${baseURL}/images/not-a-uuid`)
				.set("Authorization", `Bearer ${testEnv.authToken}`);

			expect(res.status).toBeGreaterThanOrEqual(400);
		});
	});
});
