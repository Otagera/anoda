const validateSpec = (spec, data = {}, optionalConfig = {}) => {
  const { error, value } = spec.validate(data, {
    allowUnknown: true,
    stripUnknown: true,
    errors: {
      wrap: {
        label: "",
      },
    },
    ...optionalConfig,
  });

  if (error) {
    throw new Error(error.message);
  }
  return value;
};

const aliaserSpec = (spec, data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;

  const mappedObj = {};
  Object.entries(spec).forEach(([key, value]) => {
    if (key in data) {
      mappedObj[value] = data[key];
    }
  });

  return mappedObj;
};

module.exports = {
  validateSpec,
  aliaserSpec,
};
