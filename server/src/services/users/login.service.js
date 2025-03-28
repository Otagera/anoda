const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");

const spec = {
  email: { type: "string", required: true },
  password: { type: "string", required: true },
};

const aliasSpec = {
  request: {
    email: "email",
    password: "password",
  },
  response: {
    id: "id",
    email: "email",
    accessToken: "accessToken",
    refreshToken: "refreshToken",
  },
};

const service = async (data, dependencies) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const { email, password } = validateSpec(spec, aliasReq);

  const user = await getUser({ email });

  if (!user) {
    throw new InvalidCredentialsError("Invalid email or password");
  }

  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new InvalidCredentialsError("Invalid email or password");
  }

  const { accessToken, refreshToken } = await createUserAuthToken(user.id);

  const aliasRes = aliaserSpec(aliasSpec.response, {
    ...user.toJSON(),
    accessToken,
    refreshToken,
  });

  return aliasRes;
};

module.exports = service;
