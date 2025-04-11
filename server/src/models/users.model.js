const prisma = require("@config/db.config");

const createNewUser = async (userData) => {
  return await prisma.users.create({
    data: {
      ...userData,
    },
  });
};

const updateExistingUser = async (userId, userData) => {
  return await prisma.users.update({
    where: {
      user_id: userId,
    },
    data: {
      ...userData,
    },
  });
};

const fetchUser = async (where) => {
  if (!where) {
    throw new Error("No where clause provided");
  }
  if (!where.user_id && !where.email) {
    throw new Error("No user_id or email provided");
  }

  return await prisma.users.findUnique({
    where,
  });
};

const fetchUserById = async (userId) => {
  return await prisma.users.findFirst({
    where: {
      user_id: userId,
    },
  });
};

const fetchUserByEmail = async (email) => {
  return await prisma.users.findFirst({
    where: {
      email,
    },
  });
};

const fetchUsersByIds = async (userIds) => {
  return await prisma.users.findMany({
    where: {
      user_id: {
        in: userIds,
      },
    },
  });
};

const fetchAllUsers = async () => {
  return await prisma.users.findMany();
};

const deleteUserById = async (userId) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.albums.deleteMany({
      where: {
        created_by: userId,
      },
    });
    await prisma.users.delete({
      where: {
        user_id: userId,
      },
    });
  });

  return transaction;
};

const deleteUsersByIds = async (userIds) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.users.deleteMany({
      where: {
        user_id: {
          in: userIds,
        },
      },
    });
  });

  return transaction;
};

const deleteAllUsers = async () => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.users.deleteMany({});
  });

  return transaction;
};

module.exports = {
  createNewUser,
  updateExistingUser,
  fetchUser,
  fetchUserById,
  fetchUserByEmail,
  fetchUsersByIds,
  fetchAllUsers,
  deleteUserById,
  deleteUsersByIds,
  deleteAllUsers,
};
