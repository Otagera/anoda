import { Elysia } from "elysia";
import { HTTP_STATUS_CODES } from "../../../../packages/utils/src/constants.util.ts";
import { getUsageService } from "../services/usage/getUsage.service.ts";
import { authDerivation } from "./middleware/auth.plugin.ts";

const usageRoutes = new Elysia({ prefix: "/usage" })
	.derive(authDerivation)
	.get("/", async ({ userId, set }) => {
		try {
			const data = await getUsageService({ userId });

			set.status = HTTP_STATUS_CODES.OK;
			return {
				status: "completed",
				message: "Usage statistics retrieved successfully.",
				data,
			};
		} catch (error: any) {
			set.status = error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST;
			return {
				status: "error",
				message: error?.message || "Internal server error",
				data: null,
			};
		}
	});

export default usageRoutes;
