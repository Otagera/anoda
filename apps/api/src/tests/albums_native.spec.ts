import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util";
import { setupTestEnv } from "./test-utils";

let env: Awaited<ReturnType<typeof setupTestEnv>>;

const albumData1 = {
	albumName: "Summer Vacation 2025",
};

describe("Albums API (Native)", () => {
	beforeAll(async () => {
		env = await setupTestEnv("albums");
	});

	afterAll(async () => {
		if (env?.cleanup) {
			await env.cleanup();
		}
	});

	it("should create a new album successfully", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${env.authToken}`,
			},
			body: JSON.stringify(albumData1),
		});

		const res = await env.app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);

		const body = await res.json();
		expect(body.status).toBe("completed");
		expect(body.data.albumName).toBe(albumData1.albumName);
		expect(body.data.userId).toBe(env.userId);
	});

	it("should fail to create an album without authentication", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(albumData1),
		});

		const res = await env.app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
	});

	it("should list all albums for the authenticated user", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${env.authToken}`,
			},
		});

		const res = await env.app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.OK);

		const body = await res.json();
		expect(Array.isArray(body.data.albums)).toBe(true);
		expect(body.data.albums.length).toBeGreaterThanOrEqual(1);
		expect(body.data.albums[0].albumName).toBe(albumData1.albumName);
	});
});
