const fs = require("fs");
const yaml = require("js-yaml");
const path = require("path");

const config = require("@config/index.config");

const directory = path.join(__dirname, "../../uploads");

export const clearUploads = () => {
  if (config.env === "production") {
    return;
  } else {
    fs.readdir(directory, (err, files) => {
      if (err) throw err;
      for (const file of files) {
        fs.unlink(path.join(directory, file), (err) => {
          if (err) throw err;
        });
      }
    });
    next();
  }
};

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
