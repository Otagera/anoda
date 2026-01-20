const { spawn } = require("child_process");
const config = require("@config/index.config");

/**
 * Runs a Python script with the provided arguments.
 * @param {string[]} scriptArgs - Arguments to pass to the Python script.
 * @returns {Promise<string>} - Resolves with the stdout of the Python script.
 * @throws {Error} - If the Python script fails or encounters an error.
 */
const runPythonScript = async (scriptArgs) => {
	return new Promise((resolve, reject) => {
		const pythonProcess = spawn(
			config[config.env].python_interpreter_path,
			scriptArgs,
		);

		let stdoutData = "Python script stdout: ";
		let stderrData = "";

		pythonProcess.stdout.on("data", (data) => {
			stdoutData += data.toString();
		});

		pythonProcess.stderr.on("data", (data) => {
			stderrData += data.toString();
		});

		pythonProcess.on("close", (code) => {
			if (code === 0) {
				resolve(stdoutData.trim()); // Resolve with stdout
			} else {
				reject(
					new Error(
						`Python script failed with code ${code}: stderr: ${stderrData.trim()}`,
					),
				);
			}
		});

		pythonProcess.on("error", (err) => {
			reject(err);
		});
	});
};

exports.default = runPythonScript;
