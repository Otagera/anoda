const prisma = require("@config/db.config");

const searchSimilarFaces = async (
  faceId,
  albumId,
  threshold = 0.6,
  limit = 10
) => {
  const targetFace = await prisma.faces.findUnique({
    where: { face_id: faceId },
  });

  if (!targetFace) {
    return [];
  }

  const embedding = targetFace.embedding;

  let query = `
    WITH distances AS (
      SELECT
        f.face_id,
        (
          SELECT sqrt(sum(pow(u1.val - u2.val, 2)))
          FROM unnest(f.embedding) WITH ORDINALITY AS u1(val, idx)
          JOIN unnest(ARRAY[${embedding.join(',')}]::real[]) WITH ORDINALITY AS u2(val, idx) ON u1.idx = u2.idx
        ) as distance
      FROM
        faces f
      WHERE f.face_id != '${faceId}'
    )
    SELECT
      f.face_id,
      f.image_id,
      i.image_path,
      f.bounding_box,
      d.distance
    FROM
      faces f
    JOIN
      images i ON f.image_id = i.image_id
    JOIN
      distances d ON f.face_id = d.face_id
  `;

  const whereClauses = [`d.distance <= ${threshold}`];
  if (albumId) {
    whereClauses.push(
      `i.image_id IN (SELECT image_id FROM album_images WHERE album_id = '${albumId}')`
    );
  }

  query += ` WHERE ${whereClauses.join(" AND ")}`;

  query += `
    ORDER BY
      d.distance ASC
    LIMIT ${limit};
  `;

  return await prisma.$queryRawUnsafe(query);
};

module.exports = { searchSimilarFaces };
