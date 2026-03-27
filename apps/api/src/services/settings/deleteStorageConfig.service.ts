import joi from "joi";
import {
	deleteStorageConfig,
	fetchStorageConfigs,
} from "../../../../../packages/models/src/users.model.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	userId: joi.string().required(),
	configId: joi.string().required(),
});

const service = async (data: any) => {
	const params = validateSpec(spec, data);

	// Verify ownership
	const configs = await fetchStorageConfigs(params.userId);
	const hasConfig = configs.some((c) => c.id === params.configId);

	if (!hasConfig) {
		throw new Error("Storage configuration not found or unauthorized");
	}

	await deleteStorageConfig(params.configId);

	return { success: true };
};

export const deleteStorageConfigService = service;
