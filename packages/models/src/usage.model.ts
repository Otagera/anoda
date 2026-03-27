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
