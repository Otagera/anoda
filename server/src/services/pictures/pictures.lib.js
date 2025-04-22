const {
  uploadImage,
  fetchImagesByIds,
  fetchImageById,
  fetchImage,
  uploadImages,
  deleteImage,
  fetchFaces,
  fetchImages,
} = require("@models/images.model");
const { NotFoundError } = require("@utils/error.util");
const {
  cursorPagination,
  PaginationTypeEnum,
  offsetPagination,
  decode_cursor,
} = require("@utils/pagination.util");

const validateImageData = (imageData) => {
  if (!imageData.image_path) {
    throw new Error("Album name: image_path is required");
  }

  if (!imageData.original_width) {
    throw new Error("Creator: original_width is required");
  }
  if (!imageData.original_height) {
    throw new Error("Creator: original_size.height is required");
  }

  if (!imageData.uploaded_by) {
    throw new Error("Creator: uploaded_by is required");
  }
};

const createImage = async (imageData) => {
  validateImageData(imageData);
  return await uploadImage(imageData);
};

const createImages = async (imagesData) => {
  if (!Array.isArray(imagesData)) {
    throw new Error("imagesData must be an array");
  }
  imagesData.forEach((imageData) => {
    validateImageData(imageData);
  });
  return await uploadImages(imagesData);
};

const getFaces = async (where) => {
  const { image_id, uploaded_by } = where;
  if (!image_id) {
    throw new Error("No image_id provided.");
  }
  if (!uploaded_by) {
    throw new Error("No uploaded_by provided.");
  }
  await getImage({ image_id, uploaded_by });
  return fetchFaces({ image_id, uploaded_by });
};

const getImage = async (where) => {
  if (!where) {
    throw new Error("No where clause provided.");
  }
  if (!where.uploaded_by && !where.image_id) {
    if (!where.uploaded_by) {
      throw new Error("No uploaded_by provided.");
    }
    if (!where.image_id) {
      throw new Error("No image_id provided.");
    }
  }

  const image = await fetchImage(where);
  if (!image) {
    throw new NotFoundError("Image not found.");
  }
  return image;
};

const getImageById = async (where) => fetchImageById(where);
const getImagesByIds = async (where) => fetchImagesByIds(where);

const getImages = async (where) => {
  if (!where) {
    throw new Error("No where clause provided.");
  }
  if (!where.uploaded_by) {
    if (!where.uploaded_by) {
      throw new Error("No uploaded_by provided.");
    }
  }
  const { uploaded_by } = where;

  return fetchImages({ uploaded_by });
};

const getImagesPaginaton = async (params) => {
  if (!params) {
    throw new Error("No params clause provided.");
  }

  const model = "images";
  const { page, limit, pagination_type, ...paramsRest } = params;
  const nextCursorDecoded = decode_cursor(paramsRest.next_cursor);
  const previousCursorDecoded = decode_cursor(paramsRest.previous_cursor);
  let paginatedImages;

  if (pagination_type === PaginationTypeEnum.CURSOR) {
    paginatedImages = await cursorPagination(
      model,
      limit,
      nextCursorDecoded,
      previousCursorDecoded,
      model,
      paramsRest
    );
  } else {
    paginatedImages = await offsetPagination(
      model,
      page,
      limit,
      model,
      paramsRest
    );
  }

  return paginatedImages;
};

const removeImage = async (where) => {
  if (!where) {
    throw new Error("No where clause provided.");
  }
  if (!where.uploaded_by && !where.image_id) {
    if (!where.uploaded_by) {
      throw new Error("No uploaded_by provided.");
    }
    if (!where.image_id) {
      throw new Error("No image_id provided.");
    }
  }

  const image = await fetchImage(where);
  if (!image) {
    throw new NotFoundError("Image not found.");
  }
  return await deleteImage(where);
};

module.exports = {
  createImage,
  createImages,
  getFaces,
  getImage,
  getImageById,
  getImagesByIds,
  getImages,
  getImagesPaginaton,
  removeImage,
};
