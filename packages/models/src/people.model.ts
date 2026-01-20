import prisma from "../../config/src/db.config.ts";

const createPerson = async (name: string) => {
  return await prisma.people.create({
    data: {
      name,
    },
  });
};

const getPeople = async () => {
  return await prisma.people.findMany({
    orderBy: {
      name: 'asc',
    },
  });
};

const getPersonById = async (person_id: string) => {
  return await prisma.people.findUnique({
    where: {
      person_id,
    },
    include: {
      faces: true,
    },
  });
};

export { createPerson, getPeople, getPersonById };
