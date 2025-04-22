const prisma = require("@config/db.config");

const uploadImage = async (imageData) => {
  return await prisma.images.create({
    data: imageData,
  });
};

const uploadImages = async (imagesData) => {
  return await prisma.images.createManyAndReturn({
    data: imagesData,
  });
};

const fetchFaces = async ({ image_id, uploaded_by }) => {
  return await prisma.faces.findMany({
    where: {
      image_id,
      images: { uploaded_by },
    },
  });
};

const fetchImage = async (where) => {
  return await prisma.images.findFirst({
    where,
    include: {
      faces: true,
    },
  });
};

const fetchImagesByIds = async (imageIds) => {
  const images = await prisma.images.findMany({
    where: {
      image_id: {
        in: imageIds,
      },
    },
    include: {
      faces: true,
    },
  });

  return images.map((image) => ({
    ...image,
    original_size: {
      width: image.original_width,
      height: image.original_height,
    },
  }));
};

const fetchImages = async (where) => {
  const images = await prisma.images.findMany({
    where,
    include: {
      faces: true,
    },
  });

  return images.map((image) => ({
    ...image,
    original_size: {
      width: image.original_width,
      height: image.original_height,
    },
  }));
};

const fetchAllImages = async () => {
  const images = await prisma.images.findMany({
    include: {
      faces: true,
    },
  });

  return images.map((image) => ({
    image_id: image.image_id,
    faces:
      image.faces.length > 0
        ? image.faces.map((face) => ({
            face_id: face.face_id,
            bounding_box: face.bounding_box,
          }))
        : [],
    image_path: image.image_path,
    upload_time: image.upload_date,
    original_size: {
      width: image.original_width,
      height: image.original_height,
    },
  }));
};

const deleteImage = async (where) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.faces.deleteMany({
      where: {
        image_id: where.image_id,
      },
    });

    await prisma.images.delete({
      where,
    });
  });
  return transaction;
};

const deleteImageById = async (image_id) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.faces.deleteMany({
      where: {
        image_id,
      },
    });

    await prisma.images.deleteMany({
      where: {
        image_id,
      },
    });
  });

  return transaction;
};

const deleteImagesByIds = async (imageIds) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.faces.deleteMany({
      where: {
        image_id: {
          in: imageIds,
        },
      },
    });

    await prisma.images.deleteMany({
      where: {
        image_id: {
          in: imageIds,
        },
      },
    });
  });

  return transaction;
};

const deleteImagesByUserId = async (uploaded_by) => {
  const transaction = await prisma.$transaction(async (prisma) => {
    const imagesToDelete = await prisma.images.findMany({
      where: {
        uploaded_by,
      },
    });

    const imageIdsToDelete = imagesToDelete.map((image) => image.image_id);
    await prisma.faces.deleteMany({
      where: {
        image_id: {
          in: imageIdsToDelete,
        },
      },
    });

    await prisma.images.deleteMany({
      where: {
        image_id: {
          in: imageIdsToDelete,
        },
      },
    });
  });

  return transaction;
};

const deleteAllImages = async () => {
  const transaction = await prisma.$transaction(async (prisma) => {
    await prisma.faces.deleteMany({});

    await prisma.images.deleteMany({});
  });

  return transaction;
};

// Query functions
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
  uploadImage,
  uploadImages,
  fetchFaces,
  fetchImage,
  fetchImagesByIds,
  fetchImages,
  fetchAllImages,
  deleteImage,
  deleteImageById,
  deleteImagesByIds,
  deleteImagesByUserId,
  deleteAllImages,
  fetchImagesByIdsQuery,
  fetchAllImagesQuery,
  deleteImagesByIdsQuery,
  deleteAllImagesQuery,
};
