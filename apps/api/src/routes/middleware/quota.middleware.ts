import { getUserUsage } from "../../../../../packages/models/src/usage.model.ts";
import { HTTP_STATUS_CODES } from "../../../../../packages/utils/src/constants.util.ts";

const FREE_TIER_COMPUTE_LIMIT = 50;

export const checkQuota = async ({
	userId,
	set,
}: {
	userId?: string;
	set: any;
}) => {
	if (!userId) return;

	const startOfMonth = new Date();
	startOfMonth.setDate(1);
	startOfMonth.setHours(0, 0, 0, 0);

	const usage = await getUserUsage(userId, "compute_unit", startOfMonth);

	if (usage >= FREE_TIER_COMPUTE_LIMIT) {
		set.status = 402; // Payment Required
		return {
			status: "error",
			message: `Monthly compute limit reached (${FREE_TIER_COMPUTE_LIMIT} images). Please upgrade your plan.`,
			data: null,
		};
	}
};
