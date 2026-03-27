const axios = require("axios");
const prisma =
	require("../../../../../packages/config/src/db.config.ts").default;
const config =
	require("../../../../../packages/config/src/index.config.ts").default;

const run = async (jobData) => {
	const { albumId } = jobData;

	try {
		console.log(`Starting background face clustering for album: ${albumId}`);

		// Get album owner (user_id) for creating people
		const album = await prisma.albums.findUnique({
			where: { album_id: albumId },
			select: { created_by: true },
		});

		if (!album) {
			console.error(`Album not found: ${albumId}`);
			return { status: "error", reason: "Album not found" };
		}

		const userId = album.created_by;

		// 1. Fetch all faces in this album that DO NOT have a person_id assigned yet
		// We only want to cluster new/unassigned faces to avoid overwriting user edits
		const albumImages = await prisma.album_images.findMany({
			where: { album_id: albumId },
			select: { image_id: true },
		});
		const imageIds = albumImages.map((ai) => ai.image_id);

		const unassignedFaces = await prisma.faces.findMany({
			where: {
				image_id: { in: imageIds },
				person_id: null,
			},
			select: {
				face_id: true,
				embedding: true,
			},
		});

		if (unassignedFaces.length < 2) {
			console.log(
				`Skipping clustering for ${albumId}: Not enough unassigned faces (${unassignedFaces.length})`,
			);
			return { status: "skipped", reason: "Not enough faces" };
		}

		console.log(
			`Sending ${unassignedFaces.length} faces to AI service for clustering...`,
		);

		// 2. Send embeddings to Python AI Service
		const aiServiceUrl = config[config.env].ai_service_url;
		const payload = {
			faces: unassignedFaces.map((f) => ({
				face_id: f.face_id,
				embedding: Array.from(f.embedding), // Ensure it's a standard array
			})),
		};

		const response = await axios.post(`${aiServiceUrl}/cluster`, payload);
		const clusters = response.data.clusters; // Array of Arrays: [[faceId1, faceId2], [faceId3]]

		console.log(`AI Service returned ${clusters.length} distinct clusters.`);

		// 3. Process the clusters and update the database
		let newPeopleCount = 0;
		let updatedFacesCount = 0;

		for (const cluster of clusters) {
			// A cluster is an array of face_ids.
			// The Python DBSCAN logic treats noise as clusters of length 1.
			// We only want to group people if there are multiple photos of them.
			if (cluster.length > 1) {
				// Create a new "Person" in the database
				const newPerson = await prisma.people.create({
					data: {
						name: `Unknown Person ${Math.floor(Math.random() * 1000)}`,
						user_id: userId,
					},
				});

				// Update all faces in this cluster to point to the new person
				const updateResult = await prisma.faces.updateMany({
					where: {
						face_id: { in: cluster },
					},
					data: {
						person_id: newPerson.person_id,
					},
				});

				newPeopleCount++;
				updatedFacesCount += updateResult.count;
			}
		}

		console.log(
			`Clustering complete. Created ${newPeopleCount} new people groups. Tagged ${updatedFacesCount} faces.`,
		);

		return {
			status: "success",
			newPeople: newPeopleCount,
			taggedFaces: updatedFacesCount,
		};
	} catch (error) {
		console.error(
			"Error processing face clustering task:",
			error.response?.data || error.message,
		);
		throw error;
	}
};

module.exports = run;
