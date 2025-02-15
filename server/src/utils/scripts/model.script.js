const fs = require("fs");
const path = require("path");

const fileContent = (modelName) => `
const mongoose = require("mongoose");
const connection = require("@config/db.config");

const ${modelName}Schema = new mongoose.Schema(
  {
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

const modelName = "${modelName}";

module.exports = connection.model(modelName, ${modelName}Schema);

`;
const createModel = (modelname) => {
  if (!modelname) {
    console.error("Please provide a model name.");
    process.exit(1);
  }
  const outputFileName = `${modelname}.model.js`;

  const filePath = `.${path.sep}src${path.sep}models${path.sep}${outputFileName}`;

  if (!fs.existsSync(filePath)) {
    // Write content to the file
    fs.writeFileSync(`${filePath}`, fileContent(modelname));
    console.log(`File "${outputFileName}" created with a boilerplate.`);
  } else {
    console.log(`Model "${outputFileName}" already exists.`);
  }
};
module.exports = { createModel };
