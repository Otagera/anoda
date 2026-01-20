import { HTTP_STATUS_CODES } from "../../../../../../packages/utils/src/constants.util.ts";
import searchFacesService from "../../../services/pictures/searchFaces.service.ts";
import authentication from "../../middleware/authentication.middleware.ts";

const handler = {
	method: "get",
	handler: async (req, res) => {
		try {
			const faceId = parseInt(req.params.faceId, 10);
			const { albumId, threshold, limit } = req.query;
			const data = await searchFacesService({
				faceId,
				albumId,
				threshold,
				limit,
			});
			return res.status(HTTP_STATUS_CODES.OK).send({
				status: "completed",
				message: "Similar faces retrieved successfully.",
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
	path: "/faces/:faceId/search",
	middlewares: [authentication],
};

export default handler;
