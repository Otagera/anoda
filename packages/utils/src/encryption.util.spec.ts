import { describe, expect, it } from "bun:test";
import { decrypt, encrypt } from "./encryption.util";

describe("Encryption Utility", () => {
	it("should encrypt a string into a base64 string", () => {
		const rawText = "Hello, secret world!";
		const encrypted = encrypt(rawText);

		expect(encrypted).toBeString();
		expect(encrypted).not.toBe(rawText);
		// Assuming base64 output
		expect(encrypted).toMatch(/^[a-zA-Z0-9+/]+={0,2}$/);
	});

	it("should successfully decrypt an encrypted string", () => {
		const rawText = "Data to protect: 12345";
		const encrypted = encrypt(rawText);
		const decrypted = decrypt(encrypted);

		expect(decrypted).toBe(rawText);
	});

	it("should produce different encrypted strings for different inputs", () => {
		const encrypted1 = encrypt("Text A");
		const encrypted2 = encrypt("Text B");

		expect(encrypted1).not.toBe(encrypted2);
	});

	it("should produce different encrypted strings for the same input due to random IV", () => {
		const rawText = "Same input";
		const encrypted1 = encrypt(rawText);
		const encrypted2 = encrypt(rawText);

		expect(encrypted1).not.toBe(encrypted2);

		// Both should still decrypt to the same original text
		expect(decrypt(encrypted1)).toBe(rawText);
		expect(decrypt(encrypted2)).toBe(rawText);
	});
});
