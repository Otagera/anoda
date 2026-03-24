import { HTTP_STATUS_CODES } from "./constants.util";

export const GoodResponse = (data, status_code, message) => {
	return {
		response: {
			status: "success",
			message: data?.message || message,
			data,
		},
		status_code: status_code || HTTP_STATUS_CODES.OK,
	};
};
export const BadResponse = (exc, status_code, message) => {
	return {
		response: {
			status: "error",
			message: message || exc.message,
			data: exc.data || null,
		},
		status_code: exc.error_code || status_code || HTTP_STATUS_CODES.BAD_REQUEST,
	};
};
