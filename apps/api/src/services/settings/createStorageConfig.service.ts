import joi from "joi";
import { createStorageConfig } from "../../../../../packages/models/src/users.model.ts";
import { encrypt } from "../../../../../packages/utils/src/encryption.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	userId: joi.string().required(),
	provider: joi.string().valid("r2", "s3").required(),
	name: joi.string().required(),
	accessKeyId: joi.string().required(),
	secretAccessKey: joi.string().required(),
	bucket: joi.string().required(),
	endpoint: joi.string().required(),
	region: joi.string().optional(),
	isActive: joi.boolean().optional(),
});

const aliasSpec = {
	request: {
		userId: "user_id",
		provider: "provider",
		name: "name",
		accessKeyId: "access_key_id",
		secretAccessKey: "secret_access_key",
		bucket: "bucket",
		endpoint: "endpoint",
		region: "region",
		isActive: "is_active",
	},
	response: {
		id: "id",
		name: "name",
		provider: "provider",
		bucket: "bucket",
	},
};

const service = async (data: any) => {
	const params = validateSpec(spec, data);

	// Encrypt sensitive keys
	const encryptedAccessKey = encrypt(params.accessKeyId);
	const encryptedSecretKey = encrypt(params.secretAccessKey);

	const aliasReq = aliaserSpec(aliasSpec.request, {
		...params,
		accessKeyId: encryptedAccessKey,
		secretAccessKey: encryptedSecretKey,
	});

	const result = await createStorageConfig(params.userId, aliasReq);

	return aliaserSpec(aliasSpec.response, result);
};

export const createStorageConfigService = service;
