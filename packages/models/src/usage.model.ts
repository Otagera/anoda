import prisma from "../../config/src/db.config.ts";

export const logUsage = async (
	userId: string,
	resource: string,
	operation: string,
	quantity: number = 1,
) => {
	return await prisma.usage_logs.create({
		data: {
			user_id: userId,
			resource,
			operation,
			quantity,
		},
	});
};

export const getUserUsage = async (
	userId: string,
	resource: string,
	startDate?: Date,
) => {
	const where: any = {
		user_id: userId,
		resource,
	};

	if (startDate) {
		where.timestamp = {
			gte: startDate,
		};
	}

	const logs = await prisma.usage_logs.findMany({
		where,
	});

	return logs.reduce((acc, log) => acc + log.quantity, 0);
};

export const getUserUsageStats = async (userId: string) => {
	try {
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const imagesUsed = await getUserUsage(userId, "compute_unit", startOfMonth);

		const storageLogs = await prisma.usage_logs.findMany({
			where: {
				user_id: userId,
				resource: "storage",
			},
		});

		const storageUsedBytes = storageLogs.reduce(
			(acc, log) => acc + log.quantity,
			0,
		);

		const storageUsedMB = Math.round(storageUsedBytes / (1024 * 1024));

		const FREE_TIER_IMAGES_LIMIT = 50;
		const FREE_TIER_STORAGE_MB = 1024;

		return {
			imagesUsed,
			imagesLimit: FREE_TIER_IMAGES_LIMIT,
			storageUsedMB,
			storageLimitMB: FREE_TIER_STORAGE_MB,
			plan: "free" as const,
		};
	} catch (error) {
		console.error("Error getting user usage stats:", error);
		return {
			imagesUsed: 0,
			imagesLimit: 50,
			storageUsedMB: 0,
			storageLimitMB: 1024,
			plan: "free" as const,
		};
	}
};
