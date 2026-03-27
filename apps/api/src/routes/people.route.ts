import { Elysia, t } from "elysia";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import createPersonService from "../services/people/create.service.ts";
import listPeopleService from "../services/people/list.service.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";

const peopleRoutes = new Elysia({ prefix: "/people" })
	.derive(authDerivation)
	.get("/", async ({ set, user }) => {
		try {
			const data = await listPeopleService(user.user_id);

			set.status = HTTP_STATUS_CODES.OK;
			return {
				status: "completed",
				message: "People retrieved successfully.",
				data,
			};
		} catch (error: unknown) {
			const err = error as { statusCode?: number; message?: string };
			set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
			return {
				status: "error",
				message: err?.message || "Internal server error",
				data: null,
			};
		}
	})
	.post(
		"/",
		async ({ body, set, user }) => {
			try {
				const data = await createPersonService({
					...body,
					user_id: user.user_id,
				});

				set.status = HTTP_STATUS_CODES.OK;
				return {
					status: "completed",
					message: "Person created successfully.",
					data,
				};
			} catch (error: unknown) {
				const err = error as { statusCode?: number; message?: string };
				set.status = err?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
				return {
					status: "error",
					message: err?.message || "Internal server error",
					data: null,
				};
			}
		},
		{
			body: t.Object({
				name: t.String(),
			}),
		},
	);

export default peopleRoutes;
