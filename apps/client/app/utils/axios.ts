import axios from "axios";

// Create an Axios instance
const axiosAPI = axios.create({
	baseURL: "/api/v1",
	timeout: 10000, // 10 seconds timeout
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true,
});

// Add a response interceptor (optional: to handle errors globally)
axiosAPI.interceptors.response.use(
	(response) => response,
	(error) => {
		const status = error.response?.status;
		const message = error.response?.data?.message;

		if (status === 401 || message?.includes("jwt expired")) {
			if (typeof window !== "undefined") {
				const isLoginPage = window.location.pathname === "/login";
				const isAuthMe = error.config?.url?.includes("/auth/me");

				if (!isLoginPage && !isAuthMe) {
					window.location.href = "/login";
				}
			}
		}

		if (status === 402) {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("quota-exceeded"));
				import("react-hot-toast").then(({ default: toast }) => {
					toast.error("Quota Exceeded. Please upgrade your plan.", {
						id: "quota-402",
					});
				});
			}
		}

		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	},
);

export default axiosAPI;
