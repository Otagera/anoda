import { HTTP_STATUS_CODES } from "../../../../../../packages/utils/src/constants.util.ts";
import fetchPicturesService from "../../../services/pictures/fetchPictures.service.ts";
import authentication from "../../middleware/authentication.middleware.ts";

const handler = {
	method: "get",
	handler: async (req, res) => {
		try {
			const { userId, query } = req;
			const data = await fetchPicturesService({
				userId,
				...query,
			});

			return res.status(HTTP_STATUS_CODES.OK).send({
				status: "completed",
				message: "Fetch Images successfully.",
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
	path: "/images",
	middlewares: [authentication],
};

export default handler;
