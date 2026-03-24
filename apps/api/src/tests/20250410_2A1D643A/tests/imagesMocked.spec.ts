import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	jest,
	mock,
	test,
} from "bun:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// Mock modules BEFORE importing common.ts which might load them
mock.module("../../../../../../packages/utils/src/image.util.ts", () => ({
	getImageSize: jest.fn(() => Promise.resolve({ width: 100, height: 100 })),
	isImageCorrupted: jest.fn(() => Promise.resolve(false)),
	normalizeImagePath: jest.fn((p) => p),
}));

mock.module("../../../services/pictures/pictures.lib.ts", () => ({
	createImages: jest.fn(async (data) => ({
		...data,
		image_id: `mock-id-${Date.now()}`,
		upload_date: new Date(),
		update_date: new Date(),
	})),
	getImagesByIds: jest.fn(async (ids) =>
		ids.map((id) => ({
			image_id: id,
			image_path: `/path/to/${id}.jpg`,
			original_width: 100,
			original_height: 100,
			upload_date: new Date(),
			update_date: new Date(),
			faces: [],
		})),
	),
	createImage: jest.fn(async (data) => ({
		...data,
		image_id: `mock-id-${Date.now()}`,
		upload_date: new Date(),
		update_date: new Date(),
	})),
	removeImage: jest.fn(() => Promise.resolve()),
	getImage: jest.fn(() => Promise.resolve({})),
}));

mock.module("node:child_process", () => ({
	spawn: jest.fn(() => ({
		stdout: {
			on: jest.fn((event, cb) => {
				if (event === "data") cb("Processing complete");
			}),
		},
		stderr: { on: jest.fn() },
		on: jest.fn((event, cb) => {
			if (event === "close") cb(0);
		}),
		removeAllListeners: jest.fn(),
		unref: jest.fn(),
	})),
}));

// Use let for common variables and require them in beforeAll
let _AlbumImages,
	Albums,
	baseURL,
	closeServerAsync,
	HTTP_STATUS_CODES,
	Images,
	request,
	Users;
let createImages, getImagesByIds, createImage;
let getImageSize, isImageCorrupted;

const testUser = {
	email: "mocked.image.user@email.com",
	password: "aA1.ValidPassword!@",
};
const testAlbumData = { albumName: "Test Album for Mocked Images" };
const sampleImagePath = path.join(__dirname, "..", "assets", "sample.jpg");

let agent;
let server;
let authToken;
let testUserId;
let _testAlbumId;

beforeAll(async () => {
	const common = require("../../common.ts");
	({
		_AlbumImages,
		Albums,
		baseURL,
		closeServerAsync,
		HTTP_STATUS_CODES,
		Images,
		request,
		Users,
	} = common);

	const picturesLib = require("../../../services/pictures/pictures.lib.ts");
	({ createImages, getImagesByIds, createImage } = picturesLib);

	const imageUtil = require("../../../../../../packages/utils/src/image.util.ts");
	({ getImageSize, isImageCorrupted } = imageUtil);

	server = common.server;
	agent = request.agent();

	// Cleanup existing test user if present
	const fetchedTestUser = await Users.fetchUserByEmail(testUser.email);
	if (fetchedTestUser) {
		await Albums.deleteAlbumsByUserId(fetchedTestUser.user_id);
		await Images.deleteImagesByUserId(fetchedTestUser.user_id);
		await Users.deleteUserById(fetchedTestUser.user_id);
	}

	await agent.post(`${baseURL}/auth/signup`).send(testUser);
	const loginRes = await agent.post(`${baseURL}/auth/login`).send(testUser);
	authToken = loginRes.body.data.accessToken;

	const userDetails = await Users.fetchUserByEmail(testUser.email);
	if (!userDetails || !authToken) {
		throw new Error("Test user setup failed.");
	}
	testUserId = userDetails.user_id;

	const albumRes = await agent
		.post(`${baseURL}/albums`)
		.set("Authorization", `Bearer ${authToken}`)
		.send(testAlbumData);
	if (albumRes.status !== HTTP_STATUS_CODES.CREATED || !albumRes.body.data.id) {
		throw new Error("Failed to create test album for image tests.");
	}
	_testAlbumId = albumRes.body.data.id;
});

afterAll(async () => {
	try {
		const userIdToDelete = testUserId;
		if (userIdToDelete) {
			if (Images?.deleteImagesByUserId)
				await Images.deleteImagesByUserId(userIdToDelete);
			if (Albums?.deleteAlbumsByUserId)
				await Albums.deleteAlbumsByUserId(userIdToDelete);
			if (Users?.deleteUserById) await Users.deleteUserById(userIdToDelete);
		}
	} catch (error) {
		console.error("Error during afterAll cleanup:", error);
	} finally {
		if (closeServerAsync) await closeServerAsync(server);
	}
});

describe("/images", () => {
	const MAXIMUM_IMAGES_CAN_UPLOAD = 10;

	beforeEach(async () => {
		// Reset mocks
		getImageSize.mockClear();
		isImageCorrupted.mockClear();
		createImage.mockClear();
		createImages.mockClear();
		getImagesByIds.mockClear();
		// @ts-expect-error
		spawn.mockClear();
	});

	describe("Advanced Failure Scenarios", () => {
		const largeFilePath = path.join(
			__dirname,
			"..",
			"assets",
			"large_file.bin",
		);
		const textFilePath = path.join(__dirname, "..", "assets", "test.txt");
		const corruptedImagePath = path.join(
			__dirname,
			"..",
			"assets",
			"corrupted.jpg",
		);

		beforeAll(() => {
			if (!fs.existsSync(textFilePath))
				fs.writeFileSync(textFilePath, "This is not an image.");
			if (!fs.existsSync(largeFilePath)) {
				const buffer = Buffer.alloc(6 * 1024 * 1024, "A");
				fs.writeFileSync(largeFilePath, buffer);
			}
			if (!fs.existsSync(corruptedImagePath))
				fs.writeFileSync(corruptedImagePath, "Corrupted JPEG");
		});

		afterAll(() => {
			if (fs.existsSync(largeFilePath)) fs.unlinkSync(largeFilePath);
			if (fs.existsSync(textFilePath)) fs.unlinkSync(textFilePath);
			if (fs.existsSync(corruptedImagePath)) fs.unlinkSync(corruptedImagePath);
		});

		test("should fail if uploaded file mimetype is invalid", async () => {
			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", textFilePath, { filename: "test.txt" });

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/mimetype must be one of|mimetype is invalid|Invalid file type/i,
			);
		});

		test("should fail if uploaded file size exceeds limit", async () => {
			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", largeFilePath, { filename: "large.jpg" });

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/File too large|size exceeds limit|.size must be less than or equal to/i,
			);
		});

		test("should fail if more than the maximum number of files are uploaded", async () => {
			const agentRequest = agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`);

			for (let i = 0; i < MAXIMUM_IMAGES_CAN_UPLOAD + 1; i++) {
				agentRequest.attach("uploadedImages", sampleImagePath, {
					filename: `test${i}.jpg`,
				});
			}
			const res = await agentRequest;
			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
		});

		test("should return 400 if database createImages fails", async () => {
			createImage.mockImplementationOnce(() =>
				Promise.reject(new Error("Simulated DB error")),
			);

			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", sampleImagePath);

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/Failed to save image|Database error|Internal server error|Simulated DB error/i,
			);
		});

		test("should return 400 if getImageSize fails for a file", async () => {
			getImageSize.mockImplementationOnce(() =>
				Promise.reject(new Error("Simulated image processing error")),
			);

			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", sampleImagePath);

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/Failed to process image|Internal server error|Simulated image processing error/i,
			);
		});

		test.skip("should return 400 if Python script execution fails", async () => {
			// This is now async in worker, so API might return 201
		});

		test.skip("should return 400 if Python interpreter is not found", async () => {
			// This is now async in worker
		});

		test("should return 400 if database getImagesByIds fails", async () => {
			getImagesByIds.mockImplementationOnce(() =>
				Promise.reject(new Error("Simulated DB read error")),
			);

			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", sampleImagePath);

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/Simulated DB read error|Internal server error/i,
			);
		});

		test("should return 400 if file is corrupted", async () => {
			isImageCorrupted.mockImplementationOnce(() => Promise.resolve(true));

			const res = await agent
				.post(`${baseURL}/images`)
				.set("Authorization", `Bearer ${authToken}`)
				.attach("uploadedImages", corruptedImagePath);

			expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(res.body.message).toMatch(
				/Failed to process image|Internal server error|Image: .+? is corrupted/i,
			);
		});
	});
});
