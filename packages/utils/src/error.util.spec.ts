import { describe, expect, it } from "bun:test";
import { HTTP_STATUS_CODES } from "./constants.util";
import {
	AuthError,
	InvalidRequestError,
	NotFoundError,
	OperationError,
	RateLimitError,
	ResourceInUseError,
	ValidationError,
} from "./error.util";

describe("Error Utility", () => {
	describe("OperationError", () => {
		it("should initialize with default message if no props provided", () => {
			const error = new OperationError();
			expect(error.message).toBe("An error occurred.");
			expect(error).toBeInstanceOf(Error);
		});

		it("should initialize with string message", () => {
			const error = new OperationError("Custom operation error");
			expect(error.message).toBe("Custom operation error");
		});

		it("should initialize with object props", () => {
			const error = new OperationError({
				message: "Object error",
				field: "email",
				action: "CREATE",
				value: { key: "val" },
			});
			expect(error.message).toBe("Object error");
			// @ts-expect-error - Assuming properties exist but aren't typed in the test directly
			expect(error.field).toBe("email");
			// @ts-expect-error
			expect(error.action).toBe("CREATE");
			// @ts-expect-error
			expect(error.value).toBe(JSON.stringify({ key: "val" }));
		});
	});

	describe("Custom Errors", () => {
		it("should correctly configure InvalidRequestError", () => {
			const error = new InvalidRequestError();
			expect(error.name).toBe("InvalidRequestError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
			expect(error.message).toBe("Request is invalid.");

			const customError = new InvalidRequestError("Bad request format");
			expect(customError.message).toBe("Bad request format");
		});

		it("should correctly configure RateLimitError", () => {
			const error = new RateLimitError();
			expect(error.name).toBe("RateLimitError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.TOO_MANY_REQUESTS);
			expect(error.message).toBe(
				"Rate limit in progress, please try again later.",
			);
		});

		it("should correctly configure NotFoundError", () => {
			const error = new NotFoundError();
			expect(error.name).toBe("NotFoundError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.NOTFOUND);
			expect(error.message).toBe("Resource not found.");
		});

		it("should correctly configure ResourceInUseError", () => {
			const error = new ResourceInUseError();
			expect(error.name).toBe("ResourceInUseError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.CONFLICT);
			expect(error.message).toBe("Resource is in use.");
		});

		it("should correctly configure AuthError", () => {
			const error = new AuthError();
			expect(error.name).toBe("AuthError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
			expect(error.message).toBe("Unauthorized request.");
		});

		it("should correctly configure ValidationError", () => {
			const error = new ValidationError();
			expect(error.name).toBe("ValidationError");
			expect(error.statusCode).toBe(HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY);
			expect(error.message).toBe("Validation error.");
		});
	});
});
