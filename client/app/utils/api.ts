import axiosAPI from "./axios";

// api.js
const API_URL = "/api/images"; // Replace with your API endpoint

export const fetchImages = async () => {
	try {
		const response = await axiosAPI.get("/pictures");
		return response.data;
	} catch (error) {
		console.error("Error fetching images:", error);
	}
};

export const fetchImage = async (imageId: number) => {
	try {
		const response = await axiosAPI.get(`/pictures/${imageId}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching image:", error);
	}
};

export const uploadImages = async (formData: FormData) => {
	try {
		const response = await axiosAPI.post("/upload", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		return response.data;
	} catch (error) {
		console.error("Error uploading images:", error);
	}
};

export const deleteImage = async (imageId: number) => {
	try {
		const response = await axiosAPI.delete(`/pictures/${imageId}`);
		return response.data;
	} catch (error) {
		console.error("Error deleting image:", error);
	}
};
