import { verify } from "jsonwebtoken";
import config from "../../../../../packages/config/src/index.config.ts";
import { getUser } from "../../../../../packages/models/src/users.lib.ts";
import { HTTP_STATUS_CODES } from "../../../../../packages/utils/src/constants.util.ts";
import { AuthError } from "../../../../../packages/utils/src/error.util.ts";

const authentication = async (req, res, next) => {
	let token = req.headers.authorization;
	if (token) {
		try {
			if (token.startsWith("Bearer ")) {
				token = token.split(" ")[1];
			}
			const { userId } = verify(token, config[config.env].secret);

			const validUser = await getUser({ user_id: userId });

			if (!validUser) {
				throw new AuthError("Invalid User");
			}

			req.userId = userId;
			return next();
		} catch (error: any) {
			if (
				error instanceof AuthError ||
				error.name === "JsonWebTokenError" ||
				error.name === "TokenExpiredError"
			) {
				return res
					.status(error?.statusCode || HTTP_STATUS_CODES.UNAUTHORIZED)
					.send({
						status: "error",
						message:
							error?.message ||
							"Unauthorized request, please provide a valid token.",
						data: null,
					});
			}
			console.error("[Auth Middleware Error]:", error);
			return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).send({
				status: "error",
				message: "Internal server error during authentication",
				data: null,
			});
		}
	} else {
		return res.status(HTTP_STATUS_CODES.UNAUTHORIZED).send({
			status: "error",
			message: "Unauthorized request, please login",
			data: null,
		});
	}
};

export default authentication;
