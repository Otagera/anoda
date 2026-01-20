import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Albums, Users } from "../../../../packages/models/src/index.model";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util";
import { createElysiaApp } from "../elysia";

const testUser = {
	email: "native.album.test@email.com",
	password: "ValidPassword123!",
};

const albumData1 = {
	albumName: "Summer Vacation 2025",
};

let app: any;
let authToken: string;
let testUserId: string;

describe("Albums API (Native)", () => {
	beforeAll(async () => {
		// Initialize App
		app = await createElysiaApp();

		// Cleanup
		const existingUser = await Users.fetchUserByEmail(testUser.email);
		if (existingUser) {
			await Albums.deleteAlbumsByUserId(existingUser.user_id);
			await Users.deleteUserById(existingUser.user_id);
		}

		// Signup
		const signupReq = new Request("http://localhost/api/v1/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(testUser),
		});
		const signupRes = await app.handle(signupReq);
		expect(signupRes.status).toBe(201);

		// Login
		const loginReq = new Request("http://localhost/api/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(testUser),
		});
		const loginRes = await app.handle(loginReq);
		const loginBody = await loginRes.json();
		authToken = loginBody.data.accessToken;

		const user = await Users.fetchUserByEmail(testUser.email);
		testUserId = user?.user_id;
	});

	afterAll(async () => {
		if (testUserId) {
			await Albums.deleteAlbumsByUserId(testUserId);
			await Users.deleteUserById(testUserId);
		}
	});

	it("should create a new album successfully", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${authToken}`,
			},
			body: JSON.stringify(albumData1),
		});

		const res = await app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);

		const body = await res.json();
		expect(body.status).toBe("completed");
		expect(body.data.albumName).toBe(albumData1.albumName);
		expect(body.data.userId).toBe(testUserId);
	});

	it("should fail to create an album without authentication", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(albumData1),
		});

		const res = await app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
	});

	it("should list all albums for the authenticated user", async () => {
		const req = new Request("http://localhost/api/v1/albums", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		});

		const res = await app.handle(req);
		expect(res.status).toBe(HTTP_STATUS_CODES.OK);

		const body = await res.json();
		expect(Array.isArray(body.data.albums)).toBe(true);
		expect(body.data.albums.length).toBeGreaterThanOrEqual(1);
		expect(body.data.albums[0].albumName).toBe(albumData1.albumName);
	});
});
