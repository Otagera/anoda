
const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util");

const spec = joi.object({
  
});

const aliasSpec = {
  request: {
    
  },
  response: {
    _id: "id",
    
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
};

const service = async (data, dependencies) => {
  const aliasReq = aliaserSpec(aliasSpec.request, data);
  const params = validateSpec(spec, aliasReq);
  const demo = await dependencies.models.Demo.create({ demo: params.demo });
  const aliasRes = aliaserSpec(aliasSpec.response, demo);
  return aliasRes;
};

module.exports = service;

