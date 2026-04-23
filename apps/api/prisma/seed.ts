import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	console.log("Seeding plans...");

	const freePlan = await prisma.plans.upsert({
		where: { name: "free" },
		update: {
			storage_mb: 5 * 1024,
			compute_units_per_month: 100,
		},
		create: {
			name: "free",
			storage_mb: 5 * 1024,
			compute_units_per_month: 100,
		},
	});

	const proPlan = await prisma.plans.upsert({
		where: { name: "pro" },
		update: {
			storage_mb: 50 * 1024,
			compute_units_per_month: -1,
		},
		create: {
			name: "pro",
			storage_mb: 50 * 1024,
			compute_units_per_month: -1,
		},
	});

	console.log("Plans seeded successfully.");
	console.log({ freePlan, proPlan });

	console.log("Linking users with missing plan_id to free plan...");
	await prisma.users.updateMany({
		where: { plan_id: null },
		data: { plan_id: freePlan.id, plan_name: "free" },
	});

	console.log("Seeding completed.");
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
