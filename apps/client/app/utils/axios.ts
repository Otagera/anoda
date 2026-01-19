import axios from "axios";

// Create an Axios instance
const axiosAPI = axios.create({
	baseURL: "/api/v1",
	timeout: 10000, // 10 seconds timeout
	headers: {
		"Content-Type": "application/json",
	},
});

// Add a request interceptor (optional: for auth tokens)
axiosAPI.interceptors.request.use(
	(config) => {
		if (typeof window !== "undefined") {
			const token = localStorage.getItem("token");
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		}
		return config;
	},
	(error) => Promise.reject(error)
);

// Add a response interceptor (optional: to handle errors globally)
axiosAPI.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export default axiosAPI;
