import prisma from "../../../../packages/config/src/db.config";
import { Albums, Users } from "../../../../packages/models/src/index.model";
import { createElysiaApp } from "../elysia";

/**
 * Creates an isolated test environment with a fresh user and authentication token.
 * Provides a cleanup function to wipe all data associated with the user after tests run.
 */
export const setupTestEnv = async (prefix: string) => {
	const app = await createElysiaApp();
	const email = `test.${prefix}.${Date.now()}@example.com`;
	const password = "ValidPassword123!";

	// 1. Signup
	const signupRes = await app.handle(
		new Request("http://localhost/api/v1/auth/signup", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		}),
	);

	if (signupRes.status !== 201 && signupRes.status !== 200) {
		throw new Error(`Failed to create test user: ${await signupRes.text()}`);
	}

	// 2. Login to get token
	const loginRes = await app.handle(
		new Request("http://localhost/api/v1/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		}),
	);

	const loginData = await loginRes.json();
	const authToken = loginData.data.accessToken;

	// 3. Get User ID from DB
	const user = await Users.fetchUserByEmail(email);
	if (!user) {
		throw new Error("Test user was not found in the database after creation.");
	}

	const cleanup = async () => {
		try {
			// Cleanup dependent records directly using Prisma for robustness in tests

			// Delete Albums (and cascading album_images if configured, else manual)
			await prisma.album_images.deleteMany({
				where: { albums: { created_by: user.user_id } },
			});
			await Albums.deleteAlbumsByUserId(user.user_id);

			// Delete Images (and cascading faces/album_images)
			await prisma.faces.deleteMany({
				where: { images: { uploaded_by: user.user_id } },
			});
			await prisma.album_images.deleteMany({
				where: { images: { uploaded_by: user.user_id } },
			});
			await prisma.images.deleteMany({
				where: { uploaded_by: user.user_id },
			});

			// Delete User
			await Users.deleteUserById(user.user_id);
		} catch (error) {
			console.error(
				`[Cleanup Error] Failed to cleanup test user ${email}:`,
				error,
			);
		}
	};

	return {
		app,
		email,
		password,
		authToken,
		userId: user.user_id,
		cleanup,
	};
};
