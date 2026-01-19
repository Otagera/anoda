import { Elysia, t } from "elysia";
import {
	loginService,
	signupService,
} from "../../../../packages/auth/index.ts";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";

const authRoutes = new Elysia({ prefix: "/auth" })
	.post(
		"/signup",
		async ({ body, set }) => {
			try {
				const data = await signupService(body);
				set.status = HTTP_STATUS_CODES.CREATED;
				return {
					status: "completed",
					message: "User signed up successfully.",
					data,
				};
			} catch (error) {
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
		async ({ body, set }) => {
			try {
				const data = await loginService(body);
				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "User logged in successfully.",
					data,
				};
			} catch (error) {
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
	);

export default authRoutes;
