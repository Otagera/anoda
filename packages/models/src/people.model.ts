import prisma from "../../config/src/db.config.ts";

const createPerson = async (name: string, user_id: string) => {
	return await prisma.people.create({
		data: {
			name,
			user_id,
		},
	});
};

const getPeople = async (user_id: string) => {
	return await prisma.people.findMany({
		where: {
			user_id,
		},
		orderBy: {
			name: "asc",
		},
	});
};

const getPersonById = async (person_id: string, user_id: string) => {
	return await prisma.people.findFirst({
		where: {
			person_id,
			user_id,
		},
		include: {
			faces: true,
		},
	});
};

export { createPerson, getPeople, getPersonById };
