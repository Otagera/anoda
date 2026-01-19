import fs from "node:fs";
import { unlink } from "node:fs/promises";
import yaml from "js-yaml";
import path from "node:path";

import config from "../../config/src/index.config.ts";

const deleteFile = async (filePath: string) => {
	try {
		if (fs.existsSync(filePath)) {
			await unlink(filePath);
		}
	} catch (error) {
		console.error(`Failed to delete file at ${filePath}:`, error);
	}
};

const clearUploads = () => {
	const directory = path.join(import.meta.dirname, "../uploads");
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
	}
};

const yamlToJson = (ymlFile: string) => {
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

export { clearUploads, yamlToJson, deleteFile };