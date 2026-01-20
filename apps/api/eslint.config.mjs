import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
	{
		files: ["**/*.{js,mjs,cjs}"],
		plugins: {
			js,
		},
		languageOptions: {
			sourceType: "commonjs",
			globals: {
				...globals.node,
			},
		},
		rules: {
			"no-unused-vars": [
				"warn",
				{
					varsIgnorePattern: "^_",
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
				},
			],
		},
	},
	{
		files: ["**/*.spec.js"],
		languageOptions: {
			globals: {
				...globals.jest,
			},
		},
	},
	...tseslint.configs.recommended,
];
