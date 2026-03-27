import joi from "joi";
import { getUserUsageStats } from "../../../../../packages/models/src/usage.model.ts";
import { fetchUserById } from "../../../../../packages/models/src/users.model.ts";
import { decrypt } from "../../../../../packages/utils/src/encryption.util.ts";
import {
	aliaserSpec,
	validateSpec,
} from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = joi.object({
	userId: joi.string().required(),
});

const aliasSpec = {
	request: {
		userId: "userId",
	},
	response: {
		user_id: "userId",
		email: "email",
		preferences: "preferences",
		storage_configs: "storageConfigs",
		usage: "usage",
	},
	storageConfig: {
		id: "id",
		provider: "provider",
		name: "name",
		bucket: "bucket",
		endpoint: "endpoint",
		region: "region",
		is_active: "isActive",
		created_at: "createdAt",
	},
};

const service = async (data: any) => {
	const params = validateSpec(spec, data);
	const user = await fetchUserById(params.userId);

	if (!user) throw new Error("User not found");

	const formattedConfigs = user.storage_configs.map((config) =>
		aliaserSpec(aliasSpec.storageConfig, config),
	);

	const usage = await getUserUsageStats(params.userId);

	return aliaserSpec(aliasSpec.response, {
		...user,
		storage_configs: formattedConfigs,
		usage,
	});
};

export const fetchSettingsService = service;
