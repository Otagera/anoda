import { searchFaces } from "../../../../../packages/models/src/faces.model.ts";

const findSimilarFaces = async (faceId, albumId, threshold, limit) => {
	return await searchFaces({ faceId, albumId, threshold, limit });
};

export { findSimilarFaces };
