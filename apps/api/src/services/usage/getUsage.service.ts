import Joi from "joi";
import prisma from "../../../../../packages/config/src/db.config.ts";
import { validateSpec } from "../../../../../packages/utils/src/specValidator.util.ts";

const spec = Joi.object({
	userId: Joi.string().uuid().required(),
});

const service = async (data: any) => {
	const params = validateSpec(spec, data);

	const logs = await prisma.usage_logs.findMany({
		where: { user_id: params.userId },
		orderBy: { timestamp: "desc" },
		take: 100,
	});

	// Aggregate current month usage
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

	const stats = await prisma.usage_logs.groupBy({
		by: ["resource", "operation"],
		where: {
			user_id: params.userId,
			timestamp: { gte: startOfMonth },
		},
		_sum: {
			quantity: true,
		},
	});

	return {
		recentLogs: logs,
		monthlyStats: stats,
	};
};

export const getUsageService = service;
