import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Define the target dynamically
const target = process.env.API_TARGET || "http://localhost:3005";

export default defineConfig({
	plugins: [react(), tsconfigPaths()],
	server: {
		host: true,
		proxy: {
			"/api": {
				target: target,
				changeOrigin: true,
				secure: false,
			},
		},
	},
	preview: {
		host: true,
		port: 4173,
		proxy: {
			"/api": {
				target: target,
				changeOrigin: true,
				secure: false,
			},
		},
	},
});
