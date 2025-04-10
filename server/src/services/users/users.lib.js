const { fetchUser, createNewUser } = require("@models/users.model");

const createUser = async (userData) => {
  return await createNewUser(userData);
};

const getUser = async (where) => fetchUser(where);

module.exports = {
  createUser,
  getUser,
};
