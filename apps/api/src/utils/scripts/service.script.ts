import fs from "node:fs";
import path from "node:path";

const fileContent = () => `
const joi = require("joi");
const { validateSpec, aliaserSpec } = require("@utils/specValidator.util.ts");

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

export default service;

`;
const createService = (serviceName, options) => {
	if (!serviceName) {
		console.error("Please provide a service name.");
		process.exit(1);
	}
	const outputFileName = `${serviceName}.service.js`;

	const dirPath = `.${path.sep}src${path.sep}services`;
	let filePath = "";

	if (options?.dir) {
		if (!fs.existsSync(`${dirPath}${path.sep}${options?.dir}`)) {
			fs.promises
				.mkdir(`${dirPath}${path.sep}${options?.dir}`, { recursive: true })
				.then(() => {
					console.log(
						`Folder "${`${dirPath}${path.sep}${options?.dir}`}" created successfully.`,
					);
					filePath = `${dirPath}${path.sep}${options?.dir}${path.sep}${outputFileName}`;
				})
				.catch((error) => {
					console.error(`Error creating folder: ${error.message}`);
				});
		}
		filePath = `${dirPath}${path.sep}${options?.dir}${path.sep}${outputFileName}`;
	} else {
		filePath = `${dirPath}${path.sep}${outputFileName}`;
	}

	if (!fs.existsSync(filePath)) {
		// Write content to the file
		fs.writeFileSync(
			`${filePath}`,
			fileContent(serviceName, { dir: !!options?.dir }),
		);
		console.log(`File "${outputFileName}" created with a boilerplate.`);
	} else {
		console.log(`Service "${outputFileName}" already exists.`);
	}
};
export { createService };
