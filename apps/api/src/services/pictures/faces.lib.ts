import { searchSimilarFaces } from "../../../../../packages/models/src/faces.model.ts";

const findSimilarFaces = async (faceId, albumId, threshold, limit) => {
	return await searchSimilarFaces(faceId, albumId, threshold, limit);
};

export { findSimilarFaces };
