import joi from "joi";
import {
	fetchStorageConfigs,
	updateStorageConfig,
} from "../../../../../packages/models/src/users.model.ts";
import { encrypt } from "../../../../../packages/utils/src/encryption.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	userId: joi.string().required(),
	configId: joi.string().required(),
	provider: joi.string().valid("r2", "s3"),
	name: joi.string(),
	accessKeyId: joi.string(),
	secretAccessKey: joi.string(),
	bucket: joi.string(),
	endpoint: joi.string(),
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

	// Verify ownership
	const configs = await fetchStorageConfigs(params.userId);
	const hasConfig = configs.some((c) => c.id === params.configId);

	if (!hasConfig) {
		throw new Error("Storage configuration not found or unauthorized");
	}

	const updateData: any = { ...params };
	delete updateData.userId;
	delete updateData.configId;

	if (updateData.accessKeyId)
		updateData.accessKeyId = encrypt(updateData.accessKeyId);
	if (updateData.secretAccessKey)
		updateData.secretAccessKey = encrypt(updateData.secretAccessKey);

	const aliasReq = aliaserSpec(aliasSpec.request, updateData);
	const result = await updateStorageConfig(params.configId, aliasReq);

	return aliaserSpec(aliasSpec.response, result);
};

export const updateStorageConfigService = service;
