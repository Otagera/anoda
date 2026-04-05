import { describe, expect, it } from "bun:test";
import { InvalidRequestError } from "./error.util";
import { decode_cursor } from "./pagination.util";

describe("Pagination Utility", () => {
	describe("decode_cursor", () => {
		it("should return null if the cursor is empty or undefined", () => {
			expect(decode_cursor("")).toBeNull();
			expect(decode_cursor(null)).toBeNull();
			expect(decode_cursor(undefined)).toBeNull();
		});

		it("should decode a valid base64-encoded JSON cursor", () => {
			// Arrange: Create a valid cursor payload
			const payload = { id: 12345, createdAt: "2024-01-01T00:00:00Z" };
			const encodedCursor = Buffer.from(JSON.stringify(payload)).toString(
				"base64",
			);

			// Act
			const result = decode_cursor(encodedCursor);

			// Assert
			expect(result).toEqual(payload);
		});

		it("should throw InvalidRequestError when decoding invalid base64", () => {
			// Provide base64 that decodes to non-JSON string
			const invalidCursor = Buffer.from("not-a-json-object").toString("base64");

			expect(() => decode_cursor(invalidCursor)).toThrow(InvalidRequestError);
			expect(() => decode_cursor(invalidCursor)).toThrow(
				"Invalid cursor value",
			);
		});

		it("should throw InvalidRequestError when decoding malformed strings", () => {
			// Provide garbage string
			const garbageCursor = "123123!@#!@#$$%";

			expect(() => decode_cursor(garbageCursor)).toThrow(InvalidRequestError);
		});
	});
});
