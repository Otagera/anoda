const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");

const spec = joi.object({
  email: joi.string().email().required(),
  password: joi
    .string()
    .trim()
    .regex(/[ -~]*[a-z][ -~]*/) // at least 1 lower-case
    .regex(/[ -~]*[A-Z][ -~]*/) // at least 1 upper-case
    .regex(/[ -~]*(?=[ -~])[^0-9a-zA-Z][ -~]*/) // basically: [ -~] && [^0-9a-zA-Z], at least 1 special character
    .regex(/[ -~]*[0-9][ -~]*/) // at least 1 number
    .min(8)
    .required()
    .messages({
      "string.pattern.base":
        "Invalid password. It must contain only alphanumeric characters, be at least 8 characters long, contain at least 1 uppercase character, 1 lowercase character, 1 number and 1 special character.",
    }),
});

const aliasSpec = {
  request: {
    email: "email",
    password: "password",
  },
  response: {
    _id: "id",
    email: "email",
    accessToken: "accessToken",
    refreshToken: "refreshToken",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
};

const service = async (data, dependencies) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const { email, password } = validateSpec(spec, aliasReq);

  const existingUser = await getUser({ email });

  if (existingUser) {
    throw new ResourceInUseError("Email is in use");
  }

  const encryptedPassword = await encryptPassword(password);
  const user = await createUser({ email, password: encryptedPassword });
  await createUserProfile({ firstName, lastName, userId: user.id });

  const { accessToken, refreshToken } = await createUserAuthToken(user.id);
  const activationToken = createUserActivationToken(email, user.id);

  queueServices.emailQueueLib.addJob("sendActivationEmail", {
    meta: {
      email,
      token: activationToken,
      entity: "user",
    },
    worker: "sendActivationEmail",
  });

  const aliasRes = aliaserSpec(aliasSpec.response, {
    ...user.toJSON(),
    accessToken,
    refreshToken,
    activationToken,
  });
  return aliasRes;
};

module.exports = service;
