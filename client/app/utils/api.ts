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
		const albumId = formData.get("albumId");
		const uploadResponse = await axiosAPI.post("/images", formData, {
			headers: { "Content-Type": "multipart/form-data" },
		});
		const uploadResponseData = uploadResponse.data;

		await axiosAPI.post(`/albums/${albumId}/images`, {
			imageIds: uploadResponseData.data.images.map(
				(image: any) => image.imageId
			),
		});

		return uploadResponseData;
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

export const fetchAlbums = async () => {
	try {
		const response = await axiosAPI.get("/albums");
		return response.data;
	} catch (error) {
		console.error("Error fetching albums:", error);
	}
};

export const fetchImagesInAlbum = async (albumId: string) => {
	try {
		const response = await axiosAPI.get(`/albums/${albumId}/images`);
		return response.data;
	} catch (error) {
		console.error("Error fetching images in album:", error);
	}
};

export const fetchAlbum = async (albumId: string) => {
	try {
		const response = await axiosAPI.get(`/albums/${albumId}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching album:", error);
	}
};

export const login = async (credentials: any) => {
	try {
		const response = await axiosAPI.post("/auth/login", credentials);
		return response.data;
	} catch (error) {
		console.error("Error logging in:", error);
	}
};

export const signup = async (credentials: any) => {
	try {
		const response = await axiosAPI.post("/auth/signup", credentials);
		return response.data;
	} catch (error) {
		console.error("Error signing up:", error);
	}
};

export const createAlbum = async (albumName: string) => {
	try {
		const response = await axiosAPI.post("/albums", { albumName });
		return response.data;
	} catch (error) {
		console.error("Error creating album:", error);
	}
};

export const editAlbum = async ({
	albumId,
	albumName,
}: {
	albumId: string;
	albumName: string;
}) => {
	try {
		const response = await axiosAPI.put(`/albums/${albumId}`, { albumName });
		return response.data;
	} catch (error) {
		console.error("Error editing album:", error);
	}
};

export const deleteAlbum = async (albumId: string) => {
	try {
		const response = await axiosAPI.delete(`/albums/${albumId}`);
		return response.data;
	} catch (error) {
		console.error("Error deleting album:", error);
	}
};
