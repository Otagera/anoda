import joi from "joi";
import { createUser, getUser } from "../models/src/users.lib.ts";
import {
	createUserAuthToken,
	encryptPassword,
} from "../utils/src/auth.util.ts";
import { ResourceInUseError } from "../utils/src/error.util.ts";
import { aliaserSpec, validateSpec } from "../utils/src/specValidator.util.ts";

const spec = joi.object({
	email: joi.string().email().required(),
	password: joi
		.string()
		.trim()
		.regex(/[ -~]*[a-z][ -~]*/) // at least 1 lower-case
		.regex(/[ -~]*[A-Z][ -~]*/) // at least 1 upper-case
		.regex(/[ -~]*(?=[ -~])[^0-9a-zA-Z][ -~]*/) // basically: [ -~] && [^0-9a-zA-Z], at least 1 special character
		.regex(/[ -~]*[0-9][ -~]*/) // at least 1 number
		.min(8)
		.required()
		.messages({
			"string.pattern.base":
				"Invalid password. It must contain only alphanumeric characters, be at least 8 characters long, contain at least 1 uppercase character, 1 lowercase character, 1 number and 1 special character.",
		}),
});

const aliasSpec = {
	request: {
		email: "email",
		password: "password",
	},
	response: {
		user_id: "id",
		email: "email",
		accessToken: "accessToken",
		refreshToken: "refreshToken",
		isFirstSignup: "isFirstSignup",
	},
};

const service = async (data) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const { email, password } = validateSpec(spec, aliasReq);

	const existingUser = await getUser({ email });

	if (existingUser) {
		console.log("Signup failed: Email in use", email);
		throw new ResourceInUseError("Email is in use");
	}

	const encryptedPassword = await encryptPassword(password);

	const user = await createUser({ email, password: encryptedPassword });

	const { accessToken, refreshToken } = await createUserAuthToken(user.user_id);

	const aliasRes = aliaserSpec(aliasSpec.response, {
		...user,
		accessToken,
		refreshToken,
		isFirstSignup: true,
	});
	return aliasRes;
};

export const signupService = service;
