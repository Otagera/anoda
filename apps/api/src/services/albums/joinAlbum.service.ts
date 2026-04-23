import joi from "joi";
import prisma from "../../../../../packages/config/src/db.config.ts";
import {
	BadRequestError,
	NotFoundError,
} from "../../../../../packages/utils/src/error.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	user_id: joi.string().required(),
	invite_token: joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "user_id",
		inviteToken: "invite_token",
	},
	response: {
		album_id: "albumId",
		role: "role",
	},
};

const service = async (data: unknown) => {
	const aliasReq = aliaserSpec(aliasSpec.request, data);
	const params = validateSpec(spec, aliasReq);

	const member = await prisma.album_members.findUnique({
		where: { invite_token: params.invite_token },
	});

	if (!member) {
		throw new NotFoundError("Invalid or expired invite token");
	}

	if (member.expires_at && new Date() > member.expires_at) {
		throw new BadRequestError("This invite has expired");
	}

	if (member.user_id) {
		throw new BadRequestError("This invite token has already been used");
	}

	// Check if user is already a member
	const existingMember = await prisma.album_members.findFirst({
		where: {
			album_id: member.album_id,
			user_id: params.user_id,
		},
	});

	if (existingMember) {
		throw new BadRequestError("You are already a member of this album");
	}

	const album = await prisma.albums.findUnique({
		where: { album_id: member.album_id },
	});

	if (album?.created_by === params.user_id) {
		throw new BadRequestError("You are the owner of this album");
	}

	const updatedMember = await prisma.album_members.update({
		where: { id: member.id },
		data: {
			user_id: params.user_id,
			invite_token: null, // Token is consumed
		},
	});

	return aliaserSpec(aliasSpec.response, {
		albumId: updatedMember.album_id,
		role: updatedMember.role,
	});
};

export const joinAlbumService = service;
