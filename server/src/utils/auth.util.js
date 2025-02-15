const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/index.config");
const {
  createOrUpdateUserToken,
  createOrUpdateCompanyToken,
} = require("@services/auth/token.lib");

const encryptPassword = async (password) => {
  const hash = await bcrypt.hash(password, 10);
  return hash;
};

const comparePasswords = async (password, userPassword) => {
  const match = await bcrypt.compare(password, userPassword);
  return match;
};

const createAdminToken = (adminId) => {
  const adminToken = jwt.sign(
    { adminId, type: "admin" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  return adminToken;
};

const createUserAuthToken = async (userId) => {
  const accessToken = jwt.sign(
    { userId, type: "access" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  const refreshToken = jwt.sign(
    { userId, type: "refresh" },
    config[config.env].secret,
    { expiresIn: "720h" }
  );

  try {
    const hashedToken = await hashToken(refreshToken);
    await createOrUpdateUserToken(userId, hashedToken);
  } catch (error) {
    throw new Error(error);
  }
  return { accessToken, refreshToken };
};

const createUserActivationToken = (email, userId) => {
  const token = jwt.sign(
    { userId, email, type: "activate" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  return token;
};

const createUserResetPasswordToken = (email, userId) => {
  const token = jwt.sign(
    { userId, email, type: "resetPassword" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  return token;
};

const createCompanyAuthToken = async (companyId) => {
  const accessToken = jwt.sign(
    { companyId, type: "access" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  const refreshToken = jwt.sign(
    { companyId, type: "refresh" },
    config[config.env].secret,
    { expiresIn: "720h" }
  );
  try {
    const hashedToken = await hashToken(refreshToken);
    await createOrUpdateCompanyToken(companyId, hashedToken);
  } catch (error) {
    throw new Error(error);
  }
  return { accessToken, refreshToken };
};

const createCompanyActivationToken = (email, companyId) => {
  const token = jwt.sign(
    { companyId, email, type: "activate" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  return token;
};

const createCompanyResetPasswordToken = (email, companyId) => {
  const token = jwt.sign(
    { companyId, email, type: "resetPassword" },
    config[config.env].secret,
    { expiresIn: "24h" }
  );
  return token;
};

const hashToken = async (token) => bcrypt.hash(token, 10);

const compareTokens = async (token, hashedToken) =>
  bcrypt.compare(token, hashedToken);

module.exports = {
  encryptPassword,
  comparePasswords,
  createAdminToken,
  createUserAuthToken,
  createUserActivationToken,
  createUserResetPasswordToken,
  createCompanyAuthToken,
  createCompanyActivationToken,
  createCompanyResetPasswordToken,
  hashToken,
  compareTokens,
};
