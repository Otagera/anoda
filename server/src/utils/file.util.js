const fs = require("fs");
const yaml = require("js-yaml");

const yamlToJson = (ymlFile) => {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(ymlFile, "utf8"), {
      schema: yaml.JSON_SCHEMA,
    });
  } catch (exc) {
    throw new Error("There was an error getting documentation");
  }
  return doc;
};

module.exports = {
  yamlToJson,
};
