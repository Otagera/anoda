import fs from "fs";
import yaml from "js-yaml";
import path from "path";

import config from "../../config/src/index.config.ts";

const directory = path.join(__dirname, "../uploads");

const clearUploads = () => {
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
		// Assuming 'next()' was a callback for Express middleware. This needs re-evaluation
		// if clearUploads is still used in a middleware context.
		// For now, removing 'next()' as it's not applicable in a direct utility function.
		// next();
	}
};

const yamlToJson = (ymlFile) => {
	let doc;
	try {
		doc = yaml.load(fs.readFileSync(ymlFile, "utf8"), {
			schema: yaml.JSON_SCHEMA,
		});
	} catch (_exc) {
		throw new Error("There was an error getting documentation");
	}
	return doc;
};

export { clearUploads, yamlToJson };
