const prisma = require("@config/db.config");

const createNewFace = async (data) => {
  return await prisma.faces.create({
    data,
  });
};

const fetchFace = async (face_id) => {
  return await prisma.faces.findUnique({
    where: { face_id },
  });
};

const fetchFacesByIds = async (faceIds) => {
  return await prisma.faces.findMany({
    where: {
      face_id: {
        in: faceIds,
      },
    },
  });
};

const fetchFacesByImageids = async (imageIds) => {
  return await prisma.faces.findMany({
    where: {
      image_id: {
        in: imageIds,
      },
    },
  });
};

const fetchAllFaces = async () => {
  return await prisma.faces.findMany();
};

const deleteFaceById = async (face_id) => {
  return await prisma.faces.delete({
    where: {
      face_id,
    },
  });
};

const deleteFacesByIds = async (faceIds) => {
  return await prisma.faces.deleteMany({
    where: {
      face_id: {
        in: faceIds,
      },
    },
  });
};

const deleteFacesByImageId = async (image_id) => {
  return await prisma.faces.deleteMany({
    where: {
      images: { image_id },
    },
  });
};

const deleteAllFaces = async () => {
  return await prisma.faces.deleteMany({});
};

module.exports = {
  createNewFace,
  fetchFace,
  fetchFacesByIds,
  fetchFacesByImageids,
  fetchAllFaces,
  deleteFaceById,
  deleteFacesByIds,
  deleteFacesByImageId,
  deleteAllFaces,
};
