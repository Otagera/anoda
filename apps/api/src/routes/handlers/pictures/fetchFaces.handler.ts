import { HTTP_STATUS_CODES } from "../../../../../../packages/utils/src/constants.util.ts";
import fetchFacesService from "../../../services/pictures/fetchFaces.service.ts";
import authentication from "../../middleware/authentication.middleware.ts";

const handler = {
	method: "get",
	handler: async (req, res) => {
		try {
			const imageId = req.params.imageId;
			const userId = req.userId;
			const data = await fetchFacesService({
				imageId,
				userId,
			});
			return res.status(HTTP_STATUS_CODES.OK).send({
				status: "completed",
				message: "Faces retrieved successfully.",
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
	path: "/images/:imageId/faces",
	middlewares: [authentication],
};

export default handler;
