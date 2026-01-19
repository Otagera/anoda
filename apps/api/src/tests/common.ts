import {
	AlbumImages,
	Albums,
	Faces,
	Images,
	Users,
} from "../../../../packages/models/src/index.model.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { jest } from "bun:test";
import { createElysiaApp } from "../elysia.ts";

// Mock redisClient before importing anything that might use it
jest.mock("../../../../packages/utils/src/redisClient.util.ts", () => ({
	default: {
		call: jest.fn(),
		on: jest.fn(),
	},
}));

const baseURL = "/api/v1";
const sleep = (time) => {
	return new Promise((resolve) => setTimeout(resolve, time));
};

const elysiaApp = await createElysiaApp();

/**
 * A simple wrapper to make Elysia's app.handle look like supertest for basic usage
 */
const request = {
	agent: () => {
		const makeRequest = (method, url) => {
			let headers = {};
			let body = null;
			let formData = null;
			let attachmentTasks = [];

			const promise = {
				async then(onFulfilled, onRejected) {
					const execute = async () => {
						try {
							const options: any = {
								method,
								headers: {
									...headers,
								},
							};

							if (attachmentTasks.length > 0) {
								if (!formData) formData = new FormData();
								for (const task of attachmentTasks) {
									await task();
								}
							}

							if (formData) {
								options.body = formData;
							} else {
								options.headers["content-type"] = "application/json";
								if (
									body &&
									(method === "POST" || method === "PUT" || method === "DELETE")
								) {
									options.body = JSON.stringify(body);
								}
							}

							const response = await elysiaApp.handle(
								new Request(`http://localhost${url}`, options),
							);
							const status = response.status;
							const responseBody = await response.json().catch(() => ({}));
							return { status, body: responseBody };
						} catch (e) {
							throw e;
						}
					};
					return execute().then(onFulfilled, onRejected);
				},
				set(name, value) {
					headers[name.toLowerCase()] = value;
					return this;
				},
				send(data) {
					body = data;
					return this;
				},
				field(name, value) {
					if (!formData) formData = new FormData();
					formData.append(name, value);
					return this;
				},
				attach(field, filePath, options) {
					attachmentTasks.push(async () => {
						if (!formData) formData = new FormData();
						const bunFile = Bun.file(filePath);
						const arrayBuffer = await bunFile.arrayBuffer();
						const filename =
							typeof options === "string"
								? options
								: options?.filename || filePath.split("/").pop();
						const contentType =
							typeof options === "object" ? options?.contentType : undefined;

						const file = new File([arrayBuffer], filename, {
							type: contentType || bunFile.type || "image/jpeg",
						});
						formData.append(field, file);
					});
					return this;
				},
			};

			// @ts-ignore
			return promise;
		};

		return {
			post: (url) => makeRequest("POST", url),
			get: (url) => makeRequest("GET", url),
			put: (url) => makeRequest("PUT", url),
			delete: (url) => makeRequest("DELETE", url),
		};
	},
};

const server = {
	close: (cb) => cb?.(),
	address: () => ({ port: 0 }),
};

export const closeServerAsync = async (s?: any) => {
	if (s?.close) {
		return new Promise((resolve) => s.close(resolve));
	}
};

export {
	elysiaApp as app,
	baseURL,
	request,
	server,
	sleep,
	Albums,
	Images,
	Users,
	Faces,
	AlbumImages,
	HTTP_STATUS_CODES,
};
