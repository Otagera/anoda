import { Elysia, t } from "elysia";
import { verify } from "jsonwebtoken";
import {
	loginService,
	signupService,
} from "../../../../packages/auth/index.ts";
import config from "../../../../packages/config/src/index.config.ts";
import { getUser } from "../../../../packages/models/src/users.lib.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";

const authRoutes = new Elysia({ prefix: "/auth" })
	.post(
		"/signup",
		async ({ body, set, cookie: { accessToken, refreshToken } }) => {
			try {
				const data = await signupService(body);

				accessToken.set({
					value: data.accessToken,
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 24 * 60 * 60, // 24 hours
				});

				refreshToken.set({
					value: data.refreshToken,
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 30 * 24 * 60 * 60, // 30 days
				});

				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message: "User signed up successfully.",
					data: {
						id: data.id,
						email: data.email,
					},
				};
			} catch (error) {
				console.error("Signup Error:", error);
				set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				email: t.String(),
				password: t.String(),
			}),
		},
	)
	.post(
		"/login",
		async ({ body, set, cookie: { accessToken, refreshToken } }) => {
			try {
				const data = await loginService(body);

				accessToken.set({
					value: data.accessToken,
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 24 * 60 * 60,
				});

				refreshToken.set({
					value: data.refreshToken,
					httpOnly: true,
					secure: true,
					sameSite: "lax",
					path: "/",
					maxAge: 30 * 24 * 60 * 60,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "User logged in successfully.",
					data: {
						id: data.id,
						email: data.email,
					},
				};
			} catch (error) {
				console.log("error", error);
				set.status = error?.statusCode || HTTP_STATUS_CODES.UNAUTHORIZED;
				return {
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				email: t.String(),
				password: t.String(),
			}),
		},
	)
	.post("/logout", ({ cookie: { accessToken, refreshToken } }) => {
		accessToken.remove();
		refreshToken.remove();
		return {
			status: "completed",
			message: "Logged out successfully",
		};
	})
	.get("/me", async ({ cookie: { accessToken }, set }) => {
		if (!accessToken.value) {
			set.status = HTTP_STATUS_CODES.UNAUTHORIZED;
			return { status: "error", message: "Not authenticated" };
		}

		try {
			const decoded = verify(accessToken.value, config[config.env].secret) as {
				userId: string;
			};
			const validUser = await getUser({ user_id: decoded.userId });

			if (!validUser) {
				set.status = HTTP_STATUS_CODES.UNAUTHORIZED;
				return { status: "error", message: "Invalid user" };
			}

			return {
				status: "completed",
				data: {
					id: validUser.user_id,
					email: validUser.email,
				},
			};
		} catch (error) {
			set.status = HTTP_STATUS_CODES.UNAUTHORIZED;
			return { status: "error", message: "Invalid token" };
		}
	});

export default authRoutes;
