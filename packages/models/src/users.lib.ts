import { fetchUser, createNewUser } from "./users.model";

const createUser = async (userData) => {
	return await createNewUser(userData);
};

const getUser = async (where) => fetchUser(where);

export { createUser, getUser };
