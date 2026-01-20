import { HTTP_STATUS_CODES } from "../../../../../../packages/utils/src/constants.util.ts";
import faceSearchService from "../../../services/pictures/faceSearch.service.ts";
import authentication from "../../middleware/authentication.middleware.ts";

export default {
	method: "post",
	handler: async (req, res) => {
		try {
			const { faceId, albumId } = req.query;

			const data = await faceSearchService({ faceId, albumId });
			return res.status(HTTP_STATUS_CODES.OK).send({
				status: "completed",
				message: `Face search job enqueued.`,
				data,
			});
		} catch (error) {
			return res
				.status(error?.statusCode || HTTP_STATUS_CODES.BAD_REQUEST)
				.send({
					status: "error",
					message: error?.message || "Internal server error",
					data: null,
				});
		}
	},
	path: "/images/faces/search",
	middlewares: [authentication],
};
