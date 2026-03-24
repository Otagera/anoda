import jwt from "jsonwebtoken";
import config from "../../config/src/index.config.ts";

const encryptPassword = async (password) => {
	return await Bun.password.hash(password);
};

const comparePasswords = async (password, userPassword) => {
	return await Bun.password.verify(password, userPassword);
};

const createAdminToken = (adminId) => {
	const adminToken = jwt.sign(
		{ adminId, type: "admin" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	return adminToken;
};

const createUserAuthToken = async (userId) => {
	const accessToken = jwt.sign(
		{ userId, type: "access" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	const refreshToken = jwt.sign(
		{ userId, type: "refresh" },
		config[config.env].secret,
		{ expiresIn: "720h" },
	);

	return { accessToken, refreshToken };
};

const createUserResetPasswordToken = (email, userId) => {
	const token = jwt.sign(
		{ userId, email, type: "resetPassword" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	return token;
};

const createCompanyAuthToken = async (companyId) => {
	const accessToken = jwt.sign(
		{ companyId, type: "access" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	const refreshToken = jwt.sign(
		{ companyId, type: "refresh" },
		config[config.env].secret,
		{ expiresIn: "720h" },
	);
	return { accessToken, refreshToken };
};

const createCompanyActivationToken = (email, companyId) => {
	const token = jwt.sign(
		{ companyId, email, type: "activate" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	return token;
};

const createCompanyResetPasswordToken = (email, companyId) => {
	const token = jwt.sign(
		{ companyId, email, type: "resetPassword" },
		config[config.env].secret,
		{ expiresIn: "24h" },
	);
	return token;
};

const hashToken = async (token) => {
	return await Bun.password.hash(token);
};

const compareTokens = async (token, hashedToken) => {
	return await Bun.password.verify(token, hashedToken);
};

export {
	encryptPassword,
	comparePasswords,
	createAdminToken,
	createUserAuthToken,
	createUserResetPasswordToken,
	createCompanyAuthToken,
	createCompanyActivationToken,
	createCompanyResetPasswordToken,
	hashToken,
	compareTokens,
};
