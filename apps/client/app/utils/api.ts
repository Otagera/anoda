import axiosAPI from "./axios";

export const fetchImages = async ({
	pageParam = null,
}: {
	pageParam?: string | null;
} = {}) => {
	try {
		const url = pageParam
			? `/images?paginationType=cursor&limit=25&nextCursor=${pageParam}`
			: "/images?paginationType=cursor&limit=25";
		const response = await axiosAPI.get(url);
		return response.data;
	} catch (error) {
		console.error("Error fetching images:", error);
	}
};

export const fetchImage = async (imageId: string) => {
	try {
		const response = await axiosAPI.get(`/images/${imageId}`);
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

		if (albumId && albumId !== "undefined" && albumId !== "null") {
			await axiosAPI.post(`/albums/${albumId}/images`, {
				imageIds: uploadResponseData.data.images.map(
					(image: any) => image.imageId,
				),
			});
		}

		return uploadResponseData;
	} catch (error) {
		console.error("Error uploading images:", error);
		throw error;
	}
};

export const deleteImage = async (imageId: string) => {
	try {
		const response = await axiosAPI.delete(`/images/${imageId}`);
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

export const fetchImagesInAlbum = async ({
	albumId,
	pageParam = null,
}: {
	albumId: string;
	pageParam?: string | null;
}) => {
	try {
		const url = pageParam
			? `/albums/${albumId}/images?paginationType=cursor&limit=25&nextCursor=${pageParam}`
			: `/albums/${albumId}/images?paginationType=cursor&limit=25`;
		const response = await axiosAPI.get(url);
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
		throw error;
	}
};

export const signup = async (credentials: any) => {
	try {
		const response = await axiosAPI.post("/auth/signup", credentials);
		return response.data;
	} catch (error) {
		console.error("Error signing up:", error);
		throw error;
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
	shareToken,
}: {
	albumId: string;
	albumName?: string;
	shareToken?: string | null;
}) => {
	try {
		const response = await axiosAPI.put(`/albums/${albumId}`, {
			albumName,
			shareToken,
		});
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

export const triggerClustering = async (albumId: string) => {
	try {
		const response = await axiosAPI.post(`/albums/${albumId}/cluster`);
		return response.data;
	} catch (error) {
		console.error("Error triggering clustering:", error);
		throw error;
	}
};

export const reprocessImage = async (imageId: string) => {
	try {
		const response = await axiosAPI.post(`/images/${imageId}/reprocess`);
		return response.data;
	} catch (error) {
		console.error("Error reprocessing image:", error);
		throw error;
	}
};

export const searchFaces = async ({
	faceId,
	albumId,
	threshold,
	limit,
	shareToken,
}: {
	faceId: number;
	albumId?: string;
	threshold?: number;
	limit?: number;
	shareToken?: string;
}) => {
	try {
		const url = shareToken ? "/public/faces/search" : "/faces/search";
		const body = shareToken
			? { faceId, shareToken, threshold, limit }
			: { faceId, albumId, threshold, limit };

		const response = await axiosAPI.post(url, body);
		return response.data;
	} catch (error) {
		console.error("Error searching faces:", error);
	}
};

export const fetchSharedAlbum = async (token: string) => {
	try {
		const response = await axiosAPI.get(`/public/albums/${token}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching shared album:", error);
	}
};

export const fetchSharedImage = async (token: string, imageId: string) => {
	try {
		const response = await axiosAPI.get(`/public/images/${token}/${imageId}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching shared image:", error);
	}
};

export const fetchPeople = async () => {
	try {
		const response = await axiosAPI.get("/people");
		return response.data;
	} catch (error) {
		console.error("Error fetching people:", error);
	}
};

export const createPerson = async (name: string) => {
	try {
		const response = await axiosAPI.post("/people", { name });
		return response.data;
	} catch (error) {
		console.error("Error creating person:", error);
	}
};

export const updateFace = async (
	faceId: number,
	data: { personId: string | null },
) => {
	try {
		const response = await axiosAPI.patch(`/faces/${faceId}`, data);
		return response.data;
	} catch (error) {
		console.error("Error updating face:", error);
	}
};
