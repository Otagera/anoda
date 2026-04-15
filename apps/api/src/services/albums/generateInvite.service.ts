import crypto from "node:crypto";
import joi from "joi";
import prisma from "../../../../../packages/config/src/db.config.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	album_id: joi.string().required(),
	role: joi.string().valid("VIEWER", "CONTRIBUTOR", "ADMIN").default("VIEWER"),
});

const aliasSpec = {
	request: {
		albumId: "album_id",
		role: "role",
	},
	response: {
		inviteToken: "inviteToken",
		role: "role",
	},
};

const service = async (data: unknown) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	// Generate a random secure token
	const inviteToken = crypto.randomBytes(32).toString("hex");

	// We save the token as a "pending" member by leaving user_id null
	await prisma.album_members.create({
		data: {
			album_id: params.album_id,
			role: params.role,
			invite_token: inviteToken,
		},
	});

	return aliaserSpec(aliasSpec.response, {
		inviteToken,
		role: params.role,
	});
};

export const generateInviteService = service;
