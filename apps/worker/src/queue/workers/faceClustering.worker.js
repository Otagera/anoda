import axios from "axios";
import prisma from "../../../../../packages/config/src/db.config.ts";
import config from "../../../../../packages/config/src/index.config.ts";

const run = async (jobData) => {
	const { albumId } = jobData;

	try {
		console.log(`Starting background face clustering for album: ${albumId}`);

		const album = await prisma.albums.findUnique({
			where: { album_id: albumId },
			select: { created_by: true },
		});

		if (!album) {
			console.error(`Album not found: ${albumId}`);
			return { status: "error", reason: "Album not found" };
		}

		const userId = album.created_by;

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

		const aiServiceUrl = config[config.env].ai_service_url;
		const payload = {
			faces: unassignedFaces.map((f) => ({
				face_id: f.face_id,
				embedding: Array.from(f.embedding),
			})),
		};

		const response = await axios.post(`${aiServiceUrl}/cluster`, payload);
		const clusters = response.data.clusters;

		console.log(`AI Service returned ${clusters.length} distinct clusters.`);

		let newPeopleCount = 0;
		let updatedFacesCount = 0;

		for (const cluster of clusters) {
			if (cluster.length > 1) {
				const newPerson = await prisma.people.create({
					data: {
						name: `Unknown Person ${Math.floor(Math.random() * 1000)}`,
						user_id: userId,
					},
				});

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

export default run;
