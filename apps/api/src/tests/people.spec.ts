import { describe, expect, it, beforeAll } from "bun:test";
import { createElysiaApp } from "../elysia.ts";

let app: any;
let authToken: string;

describe("People API", () => {
    beforeAll(async () => {
        app = await createElysiaApp();

        // Create user and login to get token
        const email = `test.people.${Date.now()}@example.com`;
        const password = "Password123!";

        await app.handle(
            new Request("http://localhost/api/v1/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })
        );

        const loginRes = await app.handle(
            new Request("http://localhost/api/v1/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })
        );
        
        const loginData = await loginRes.json();
        authToken = loginData.data.accessToken;
    });

    it("should create a person", async () => {
        const response = await app.handle(
            new Request("http://localhost/api/v1/people", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${authToken}`
                },
                body: JSON.stringify({ name: "John Doe" }),
            })
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
                    "Authorization": `Bearer ${authToken}`
                }
            })
        );
        
        expect(response.status).toBe(200);
        const json = await response.json();
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data.length).toBeGreaterThan(0);
    });
});
