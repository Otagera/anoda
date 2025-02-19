const pool = require("@config/db.config");

const fetchImagesByIdsQuery = async (imageIds) => {
  return pool.query(
    `
        SELECT 
            images.image_id,
            COALESCE(
                JSON_AGG(
                    CASE 
                        WHEN faces.face_id IS NOT NULL THEN 
                            JSON_BUILD_OBJECT(
                                'face_id', faces.face_id,
                                'bounding_box', faces.bounding_box::JSONB
                            )
                        ELSE NULL
                    END
                ) FILTER (WHERE faces.face_id IS NOT NULL), 
                '[]'::JSON -- Ensure empty array if no faces exist
            ) AS faces,
            images.image_path,
            images.upload_time,
            images.original_size::JSONB AS original_size
        FROM images
        LEFT JOIN faces ON faces.image_id = images.image_id
        WHERE images.image_id = ANY($1)
        GROUP BY 
            images.image_id, 
            images.image_path, 
            images.upload_time, 
            images.original_size::JSONB;
  `,
    [imageIds]
  );
};

const fetchAllImagesQuery = async () => {
  return pool.query(
    `
        SELECT 
            images.image_id,
            COALESCE(
                JSON_AGG(
                    CASE 
                        WHEN faces.face_id IS NOT NULL THEN 
                            JSON_BUILD_OBJECT(
                                'face_id', faces.face_id,
                                'bounding_box', faces.bounding_box::JSONB
                            )
                        ELSE NULL
                    END
                ) FILTER (WHERE faces.face_id IS NOT NULL), 
                '[]'::JSON -- Ensure empty array if no faces exist
            ) AS faces,
            images.image_path,
            images.upload_time,
            images.original_size::JSONB AS original_size
        FROM images
        LEFT JOIN faces ON faces.image_id = images.image_id
        GROUP BY 
            images.image_id, 
            images.image_path, 
            images.upload_time, 
            images.original_size::JSONB;
  `,
    []
  );
};

const deleteImagesByIdsQuery = async (imageIds) => {
  try {
    await pool.query("BEGIN");
    const queryText = `DELETE FROM "faces" WHERE image_id = ANY($1) RETURNING *;`;
    await pool.query(queryText, [imageIds]);
    const deletePhotoText = `DELETE FROM "images" WHERE image_id = ANY($1) RETURNING *;`;
    const deletePhotoValues = [imageIds];
    await pool.query(deletePhotoText, deletePhotoValues);
    return pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  } finally {
  }
};

const deleteAllImagesQuery = async () => {
  try {
    await pool.query("BEGIN");
    const queryText = `DELETE FROM "faces" RETURNING *;`;
    const res = await pool.query(queryText, [imageIds]);
    console.log("res", res);
    const insertPhotoText = `DELETE FROM "images" RETURNING *;`;
    const insertPhotoValues = [imageIds];
    await pool.query(insertPhotoText, insertPhotoValues);
    return pool.query("COMMIT");
  } catch (e) {
    await pool.query("ROLLBACK");
    throw e;
  } finally {
  }
};

module.exports = {
  fetchImagesByIdsQuery,
  fetchAllImagesQuery,
  deleteImagesByIdsQuery,
  deleteAllImagesQuery,
};
