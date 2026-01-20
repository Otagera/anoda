import { HTTP_STATUS_CODES } from "../../../../../../packages/utils/src/constants.util.ts";
import deletePicturesService from "../../../services/pictures/deletePictures.service.ts";

const handler = {
	method: "delete",
	handler: async (_req, res) => {
		try {
			const data = await deletePicturesService();
			return res.status(HTTP_STATUS_CODES.OK).send({
				status: "completed",
				message: `Successfully deleted pictures`,
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
	path: "/pictures",
	middlewares: [],
};

export default handler;
