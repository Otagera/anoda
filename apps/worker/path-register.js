const tsconfigPaths = require("tsconfig-paths");
const config = require("./jsconfig.json");

tsconfigPaths.register({
	baseUrl: config.compilerOptions.baseUrl,
	paths: config.compilerOptions.paths,
});
