import prisma from "../../config/src/db.config.ts";

const fetchFaceById = async (face_id) => {
	return await prisma.faces.findUnique({
		where: {
			face_id,
		},
	});
};

const createNewFace = async (data) => {
	return await prisma.faces.create({
		data,
	});
};

const deleteFacesByImageId = async (image_id) => {
	return await prisma.faces.deleteMany({
		where: {
			image_id,
		},
	});
};

const searchFaces = async ({

	faceId,

	albumId,

	threshold = 0.8,

	limit = 10,

	imageIds,

}: {

	faceId: number;

	albumId?: string;

	threshold?: number;

	limit?: number;

	imageIds?: string[];

}) => {

	const targetFace = await fetchFaceById(faceId);

	if (!targetFace) {

		return [];

	}

	const embedding = targetFace.embedding;



	const params = [faceId, embedding, threshold, limit];



	let query = `

    WITH distances AS (

      SELECT

        f.face_id,

        (

          SELECT sqrt(sum(pow(u1.val - u2.val, 2)))

          FROM unnest(f.embedding) WITH ORDINALITY AS u1(val, idx)

          JOIN unnest($2::real[]) WITH ORDINALITY AS u2(val, idx) ON u1.idx = u2.idx

        ) as distance

      FROM

        faces f

      WHERE f.face_id != 


    )

    SELECT

      f.face_id as "faceId",

      f.image_id as "imageId",

      i.image_path as "imagePath",

      f.bounding_box as "boundingBox",

      d.distance

    FROM

      faces f

    JOIN

      images i ON f.image_id = i.image_id

    JOIN

      distances d ON f.face_id = d.face_id

  `;



	const whereClauses = ["d.distance <= $3"];

	if (albumId) {

		params.push(albumId);

		whereClauses.push(

			`i.image_id IN (SELECT image_id FROM album_images WHERE album_id = ${params.length}::uuid)`,

		);

	}



	if (imageIds && imageIds.length > 0) {

		params.push(imageIds);

		whereClauses.push(`i.image_id = ANY(${params.length}::uuid[])`);

	}



	query += ` WHERE ${whereClauses.join(" AND ")}`;



	query += `

    ORDER BY

      d.distance ASC

    LIMIT $4;

  `;



	return (await prisma.$queryRawUnsafe(query, ...params)) as any[];

};



export {

	fetchFaceById,

	searchFaces,

	createNewFace,

	deleteFacesByImageId,

};
