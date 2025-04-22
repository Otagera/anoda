const path = require("path");
const {
  request,
  baseURL,
  Users,
  Faces,
  Albums,
  Images,
  AlbumImages,
  closeServerAsync,
  HTTP_STATUS_CODES,
} = require("../../common");

const testUser = {
  email: "ogimage.prisma.user@email.com",
  password: "aA1.ValidPassword!@",
};
const testAlbumData = { albumName: "Test Album for Images" };
const sampleImagePath = path.join(__dirname, "..", "assets", "sample.jpg");
const faceslessImagePath = path.join(
  __dirname,
  "..",
  "assets",
  "facesless.jpeg"
);

let agent;
let server;
let authToken;
let testUserId;
let testAlbumId;

beforeAll(async () => {
  const common = require("../../common");
  server = common.server;
  agent = request.agent(server);

  // Cleanup existing test user if present
  const fetchedTestUser = await Users.fetchUserByEmail(testUser.email);
  if (fetchedTestUser) {
    // Cascade delete or delete related data first
    await Albums.deleteAlbumsByUserId(fetchedTestUser.user_id);
    await Images.deleteImagesByUserId(fetchedTestUser.user_id);
    await Users.deleteUserById(fetchedTestUser.user_id);
  }

  await agent.post(`${baseURL}/auth/signup`).send(testUser);
  const loginRes = await agent.post(`${baseURL}/auth/login`).send(testUser);
  authToken = loginRes.body.data.accessToken;

  const userDetails = await Users.fetchUserByEmail(testUser.email);
  if (!userDetails || !authToken) {
    throw new Error("Test user setup failed.");
  }
  testUserId = userDetails.user_id;

  const albumRes = await agent
    .post(`${baseURL}/albums`)
    .set("Authorization", `Bearer ${authToken}`)
    .send(testAlbumData);
  if (albumRes.status !== HTTP_STATUS_CODES.CREATED || !albumRes.body.data.id) {
    throw new Error("Failed to create test album for image tests.");
  }
  testAlbumId = albumRes.body.data.id;
});

afterAll(async () => {
  try {
    let userIdToDelete = testUserId;

    if (!userIdToDelete && Users.fetchUserByEmail) {
      console.warn(
        "testUserId not set in afterAll, attempting to fetch by email..."
      );
      try {
        const fetchedTestUser = await Users.fetchUserByEmail(testUser.email);
        if (fetchedTestUser && fetchedTestUser.user_id) {
          userIdToDelete = fetchedTestUser.user_id;
        } else {
          console.warn(
            `User with email ${testUser.email} not found for cleanup.`
          );
        }
      } catch (fetchError) {
        console.error(
          `Error fetching user by email during cleanup: ${fetchError.message}`
        );
      }
    }

    if (userIdToDelete) {
      // Delete in reverse order of dependency or use cascade deletes
      // if (AlbumImages && AlbumImages.deleteLinksByUserId) {
      // Or delete by album/image IDs if user ID link isn't direct
      // await AlbumImages.deleteLinksByUserId(userIdToDelete);
      // }
      if (Images && Images.deleteImagesByUserId) {
        await Images.deleteImagesByUserId(userIdToDelete);
      }
      if (Albums && Albums.deleteAlbumsByUserId) {
        await Albums.deleteAlbumsByUserId(userIdToDelete);
      }
      if (Users && Users.deleteUserById) {
        const userExists = await Users.fetchUserById(userIdToDelete);
        if (userExists) {
          await Users.deleteUserById(userIdToDelete);
        }
      }
    } else {
      console.warn("No testUserId found, skipping user/data cleanup.");
    }
  } catch (error) {
    console.error("Error during afterAll cleanup:", error);
  } finally {
    await closeServerAsync(server);
  }
});

// TODO - add tests for delete images & fetch images
describe("/images", () => {
  // Cleanup images potentially created by the user before each test in this block
  beforeEach(async () => {
    if (testUserId && Images && Images.deleteImagesByUserId) {
      await Images.deleteImagesByUserId(testUserId);
    }
    // Clean album<->image links too if necessary for test independence
    if (testAlbumId && AlbumImages && AlbumImages.deleteLinksByAlbumId) {
      await AlbumImages.deleteLinksByAlbumId(testAlbumId);
    }
  });

  describe("POST /images", () => {
    test("should upload a new image successfully", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .field("description", "This is a test image")
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        "Image uploaded and face processing initiated."
      );
      expect(Array.isArray(res.body.data.images)).toBe(true);
      expect(res.body.data.images.length).toBe(1);

      const firstImage = res.body.data.images[0];
      expect(firstImage).toBeDefined();

      expect(firstImage).toHaveProperty("imageId");
      expect(firstImage).toHaveProperty("imagePath");
      expect(firstImage).toHaveProperty("uploadDate");

      expect(firstImage).toHaveProperty("originalSize");
      expect(firstImage.originalSize).toHaveProperty("height");
      expect(firstImage.originalSize).toHaveProperty("width");

      // Cleanup the created image
      if (firstImage.image_id && Images && Images.deleteImageById) {
        await Images.deleteImageById(firstImage.image_id);
      }
    }, 20000);

    test("should fail to upload without authentication", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should fail to upload without an image file", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch("files is required");
    });

    test("should fail with invalid authentication token", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer invalidToken`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });
  });

  describe("GET /images/:imageId", () => {
    let testImageId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      if (
        createRes.status !== HTTP_STATUS_CODES.CREATED ||
        !createRes.body.data.images[0].imageId
      ) {
        throw new Error(
          "Failed to create image in beforeEach for GET/DELETE tests"
        );
      }
      testImageId = createRes.body.data.images[0].imageId;
    }, 20000);

    afterEach(async () => {
      // Ensure cleanup even if a test fails mid-way
      if (testImageId && Images && Images.deleteImageById) {
        try {
          // Attempt to delete via API first to ensure test isolation
          await agent
            .delete(`${baseURL}/images/${testImageId}`)
            .set("Authorization", `Bearer ${authToken}`);
        } catch (apiError) {
          // Fallback to direct DB deletion if API fails or ID is known
          await Images.deleteImageById(testImageId);
        }
      }
      testImageId = null; // Reset ID
    });

    test("should view a specific image successfully", async () => {
      const res = await agent
        .get(`${baseURL}/images/${testImageId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        `Image: ${testImageId} retrieved successfully.`
      );
      expect(res.body.data).toHaveProperty("imageId", testImageId);
      expect(res.body.data).toHaveProperty("userId", testUserId);
      expect(res.body.data).toHaveProperty("faces");
      expect(res.body.data).toHaveProperty("uploadDate");
      expect(res.body.data).toHaveProperty("imagePath");
      expect(res.body.data).toHaveProperty("originalSize");
      expect(res.body.data.originalSize).toHaveProperty("width");
      expect(res.body.data.originalSize).toHaveProperty("height");
    });

    test("should fail to view image without authentication", async () => {
      const res = await agent.get(`${baseURL}/images/${testImageId}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if the image ID does not exist", async () => {
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000"; // Example non-existent UUID
      const res = await agent
        .get(`${baseURL}/images/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Image not found.");
    });
  });

  describe("DELETE /images/:imageId", () => {
    let testImageId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);
      if (
        createRes.status !== HTTP_STATUS_CODES.CREATED ||
        !createRes.body.data.images[0].imageId
      ) {
        throw new Error(
          "Failed to create image in beforeEach for DELETE tests"
        );
      }
      testImageId = createRes.body.data.images[0].imageId;
    }, 20000);

    test("should delete an image successfully", async () => {
      const res = await agent
        .delete(`${baseURL}/images/${testImageId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        `Image: ${testImageId} deleted successfully.`
      );

      // Verify deletion
      const getRes = await agent
        .get(`${baseURL}/images/${testImageId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(getRes.status).toBe(HTTP_STATUS_CODES.NOTFOUND);

      testImageId = null; // Prevent accidental cleanup in afterAll if successful
    });

    test("should fail to delete without authentication", async () => {
      const res = await agent.delete(`${baseURL}/images/${testImageId}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);

      // Cleanup required here as the test failed before deleting
      if (testImageId && Images && Images.deleteImageById) {
        await Images.deleteImageById(testImageId);
      }
    });

    test("should return 404 if trying to delete image ID that does not exist", async () => {
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .delete(`${baseURL}/images/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Image not found.");

      // Cleanup required here as the test failed before deleting the *correct* image
      if (testImageId && Images && Images.deleteImageById) {
        await Images.deleteImageById(testImageId);
      }
    });
  });
});

// --- Album-Image Linking Endpoint Tests ---
describe("/albums/:albumId/images", () => {
  let testImageId1;
  let testImageId2;

  beforeAll(async () => {
    // Ensure testAlbumId is set from the main beforeAll
    if (!testAlbumId)
      throw new Error("Test album ID not available for album-image tests");

    const createRes1 = await agent
      .post(`${baseURL}/images`)
      .set("Authorization", `Bearer ${authToken}`)
      .attach("uploadedImages", sampleImagePath);
    const createRes2 = await agent
      .post(`${baseURL}/images`)
      .set("Authorization", `Bearer ${authToken}`)
      .attach("uploadedImages", sampleImagePath);

    if (
      createRes1.status !== HTTP_STATUS_CODES.CREATED ||
      !createRes1.body.data.images[0].imageId ||
      createRes2.status !== HTTP_STATUS_CODES.CREATED ||
      !createRes2.body.data.images[0].imageId
    ) {
      throw new Error(
        "Failed to create images in beforeAll for album-image tests"
      );
    }
    testImageId1 = createRes1.body.data.images[0].imageId;
    testImageId2 = createRes2.body.data.images[0].imageId;
  }, 20000);

  afterAll(async () => {
    if (testImageId1 && Images && Images.deleteImageById)
      await Images.deleteImageById(testImageId1);
    if (testImageId2 && Images && Images.deleteImageById)
      await Images.deleteImageById(testImageId2);
  });

  // Clean links before each test in this suite
  beforeEach(async () => {
    if (testAlbumId && AlbumImages && AlbumImages.deleteLinksByAlbumId) {
      await AlbumImages.deleteLinksByAlbumId(testAlbumId);
    }
  });

  describe("POST /albums/:albumId/images", () => {
    test("should add an existing image to an album", async () => {
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("Image added to album successfully.");
      expect(res.body.data).toBeInstanceOf(Array);
      expect(Array.isArray(res.body.data)).toBe(true);

      expect(res.body.data[0]).toHaveProperty("imageId", testImageId1);
      expect(res.body.data[0]).toHaveProperty("albumId", testAlbumId);
      expect(res.body.data[0]).toHaveProperty("albumImageId");
    });

    test("should fail without authentication", async () => {
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .send({ imageIds: [testImageId1] });
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should fail if album does not exist", async () => {
      const nonExistentAlbumId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .post(`${baseURL}/albums/${nonExistentAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Album not found.");
    });

    test("should fail if image does not exist", async () => {
      const nonExistentImageId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [nonExistentImageId] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Images not found.");
    });

    test("should fail if imageIds is missing in request body", async () => {
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(/image_ids is required/i);
    });

    test("should handle adding the same image twice (idempotent or conflict)", async () => {
      // First add
      await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      // Second add
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      // Expect either OK (if idempotent) or Conflict
      expect(res.status).toBe(HTTP_STATUS_CODES.OK); // Or CREATED or CONFLICT (409)
      // Optionally check message if status is OK/CREATED: "Image already in album."
      // Or if status is CONFLICT: "Image already exists in album."
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toMatch(/already exists|added/i);
    });
  });

  describe("GET /albums/:albumId/images", () => {
    beforeEach(async () => {
      await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1, testImageId2] });
    });

    test("should list images in a specific album", async () => {
      const res = await agent
        .get(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("Album images retrieved successfully.");
      expect(Array.isArray(res.body.data.imagesInAlbum)).toBe(true);
      expect(res.body.data.imagesInAlbum.length).toBe(2);

      const imageIds = res.body.data.imagesInAlbum.map((img) => img.imageId);
      expect(imageIds).toContain(testImageId1);
      expect(imageIds).toContain(testImageId2);
      expect(res.body.data.imagesInAlbum[0]).toHaveProperty("albumId");
      expect(res.body.data.imagesInAlbum[0]).toHaveProperty("imageId");
      expect(res.body.data.imagesInAlbum[0]).toHaveProperty("albumImageId");
      expect(res.body.data.imagesInAlbum[0].images).toHaveProperty("imagePath");
      expect(res.body.data.imagesInAlbum[0].images).toHaveProperty(
        "originalSize"
      );
    });

    test("should return an empty array if album has no images", async () => {
      if (AlbumImages && AlbumImages.deleteLinksByAlbumId) {
        await AlbumImages.deleteLinksByAlbumId(testAlbumId);
      }

      const res = await agent
        .get(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(res.body.data.imagesInAlbum)).toBe(true);
      expect(res.body.data.imagesInAlbum.length).toBe(0);
    });

    test("should fail without authentication", async () => {
      const res = await agent.get(`${baseURL}/albums/${testAlbumId}/images`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if album does not exist", async () => {
      const nonExistentAlbumId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .get(`${baseURL}/albums/${nonExistentAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
    });
  });
  /* If need be I will handle this replcement update.
  describe("PUT /albums/:albumId/images", () => {
    let updateTestAlbumId;
    const updateImageIds = [];

    beforeEach(async () => {
      updateImageIds.length = 0;

      // Ensure testUserId is available
      if (!global.testUserId)
        throw new Error("testUserId is required for setup.");

      // 1. Create Album using helper
      const albumData = {
        albumName: `Update Test Album ${Date.now()}`,
        userId: global.testUserId,
      };
      // Ensure createAlbum helper is available and returns the created album object with id
      if (!createAlbum)
        throw new Error("createAlbum helper function is missing.");
      const createdAlbum = await createAlbum(albumData);
      updateTestAlbumId = createdAlbum.album_id; // Adjust property name if needed
      if (!updateTestAlbumId)
        throw new Error("Failed to create album for PUT test setup.");

      // 2. Create Images using helper
      if (!createImage)
        throw new Error("createImage helper function is missing.");
      for (let i = 0; i < 4; i++) {
        const imageData = {
          image_path: `/path/real_update_img_${i}_${Date.now()}.jpg`,
          original_width: 50 + i,
          original_height: 50 + i,
          // Add userId if needed by create logic
        };
        const createdImage = await createImage(imageData);
        if (!createdImage?.image_id)
          throw new Error(`Failed to create image ${i} for PUT test setup.`);
        updateImageIds.push(createdImage.image_id);
      }

      // 3. Link initial images (e.g., first 2) using helper
      if (!linkImageToAlbum)
        throw new Error("linkImageToAlbum helper function is missing.");
      await linkImageToAlbum(updateTestAlbumId, updateImageIds[0]);
      await linkImageToAlbum(updateTestAlbumId, updateImageIds[1]);
    }, 20000);

    afterEach(async () => {
      if (deleteLinksByAlbumId && updateTestAlbumId) {
        try {
          await deleteLinksByAlbumId(updateTestAlbumId);
        } catch (e) {
          console.error(
            `Cleanup error deleting links for album ${updateTestAlbumId}:`,
            e
          );
        }
      }
      if (deleteAlbumById && updateTestAlbumId) {
        try {
          await deleteAlbumById(updateTestAlbumId);
        } catch (e) {
          console.error(
            `Cleanup error deleting album ${updateTestAlbumId}:`,
            e
          );
        }
      }
      for (const imgId of updateImageIds) {
        if (deleteImageById) {
          try {
            await deleteImageById(imgId);
          } catch (e) {
            console.error(`Cleanup error deleting image ${imgId}:`, e);
          }
        }
      }
      updateImageIds.length = 0;
      updateTestAlbumId = null;
    });

    test("should replace existing images with a new set", async () => {
      const newImageSet = [updateImageIds[2], updateImageIds[3]]; // Replace with 3rd and 4th images

      // Perform the API call
      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: newImageSet });

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toMatch(/Album images updated successfully/i);

      // Verify state using a GET request or a direct DB helper
      const verifyRes = await agent
        .get(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(verifyRes.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(verifyRes.body.data.images)).toBe(true);
      const resultingImageIds = verifyRes.body.data.images
        .map((img) => img.image_id)
        .sort();
      expect(resultingImageIds).toEqual(newImageSet.sort());
    });

    test("should set album images to empty array", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [] }); // Send empty array

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");

      // Verify state using a GET request
      const verifyRes = await agent
        .get(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(verifyRes.status).toBe(HTTP_STATUS_CODES.OK);
      expect(verifyRes.body.data.images).toEqual([]);
    });

    test("should fail without authentication", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .send({ imageIds: [updateImageIds[0]] });
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if album ID does not exist", async () => {
      const nonExistentAlbumId = "123e4567-e89b-12d3-a456-426614174000"; // Use a valid UUID format likely not in DB

      const res = await agent
        .put(`${baseURL}/albums/${nonExistentAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [updateImageIds[0]] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toMatch(/Album not found/i);
    });

    test("should return 400/404 if an image ID in the list does not exist", async () => {
      const nonExistentImageId = "123e4567-e89b-12d3-a456-426614174999"; // Use a valid UUID format likely not in DB

      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [updateImageIds[0], nonExistentImageId] });

      // The status code depends on how the backend handles this:
      // 404 if it checks image existence before attempting the update.
      // 400 if it considers it a bad request due to invalid input data.
      expect([
        HTTP_STATUS_CODES.BAD_REQUEST,
        HTTP_STATUS_CODES.NOTFOUND,
      ]).toContain(res.status);
      expect(res.body.message).toMatch(
        /Image not found|One or more images do not exist/i
      );
    });

    test("should return 400 if request body is invalid (missing imageIds)", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({}); // Missing imageIds field

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(/imageIds is required/i); // Adjust based on validation library
    });

    test("should return 400 if imageIds is not an array", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${updateTestAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: "not-an-array" }); // Invalid type

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(/imageIds must be an array/i);
    });
  }); 
  */
  describe("POST /albums/:albumId/images/delete-batch", () => {
    beforeEach(async () => {
      await agent
        .post(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });
    });

    test("should remove an image from an album", async () => {
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images/delete-batch`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      expect(res.status).toBe(HTTP_STATUS_CODES.OK); // Or 204 No Content
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        "Image(s) removed from album successfully."
      );

      // Verify removal
      const getRes = await agent
        .get(`${baseURL}/albums/${testAlbumId}/images`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(getRes.body.data.imagesInAlbum.length).toBe(0); // Assumes only this image was linked
    });

    test("should fail without authentication", async () => {
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images/delete-batch`)
        .send({ imageIds: [testImageId1] });
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if album does not exist", async () => {
      const nonExistentAlbumId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .post(`${baseURL}/albums/${nonExistentAlbumId}/images/delete-batch`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId1] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toMatch(/Album not found/i);
    });

    test("should return 404 if image does not exist", async () => {
      const nonExistentImageId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images/delete-batch`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [nonExistentImageId] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toMatch(/Images not found|Link not found/i);
    });

    test("should return 404 if image exists but is not in the specified album", async () => {
      // testImageId2 exists but wasn't added in this specific beforeEach
      const res = await agent
        .post(`${baseURL}/albums/${testAlbumId}/images/delete-batch`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ imageIds: [testImageId2] });

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toMatch(
        /Image\(s\) not found in album.|Link not found/i
      );
    });
  });
});

describe("Faces Endpoints", () => {
  let testImageId;
  let testFaceId1;

  beforeAll(async () => {
    // Create an image to associate faces with
    const createRes = await agent
      .post(`${baseURL}/images`)
      .set("Authorization", `Bearer ${authToken}`)
      .attach("uploadedImages", sampleImagePath);

    if (
      createRes.status !== HTTP_STATUS_CODES.CREATED ||
      !createRes.body.data.images[0].imageId
    ) {
      throw new Error("Failed to create image in beforeAll for faces tests");
    }
    testImageId = createRes.body.data.images[0].imageId;

    // *** Crucial Part: Mock Face Creation ***
    // Since face detection isn't usually a direct API call, we simulate its result
    // by adding face data directly to the DB using our helper.
    if (Faces && Faces.createNewFace) {
      const faceData1 = {
        image_id: testImageId,
        embedding: [0.1, 0.2, 0.3], // Example embedding
        bounding_box: { top: 10, left: 20, right: 50, left: 60 }, // Example bbox JSON
      };
      const createdFace = await Faces.createNewFace(faceData1);
      testFaceId1 = createdFace.face_id;

      // Create another face for the same image if needed for list tests
      // const faceData2 = { ... }; await Faces.createNewFace(faceData2);
    } else {
      throw new Error(
        "Faces helper or createFace function is missing for test setup."
      );
    }
    if (!testFaceId1) {
      throw new Error("Failed to create mock face data for tests.");
    }
  }, 20000);

  afterAll(async () => {
    // Clean up the image and associated faces
    if (testImageId) {
      if (Faces && Faces.deleteFacesByImageId) {
        await Faces.deleteFacesByImageId(testImageId); // Use helper
      }
      if (Images && Images.deleteImageById) {
        await Images.deleteImageById(testImageId); // Use helper
      }
    }
  });

  describe("GET /images/:imageId/faces", () => {
    test("should list faces for a specific image", async () => {
      const res = await agent
        .get(`${baseURL}/images/${testImageId}/faces`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("Faces retrieved successfully.");
      expect(Array.isArray(res.body.data.faces)).toBe(true);
      expect(res.body.data.faces.length).toBeGreaterThanOrEqual(1);

      const face = res.body.data.faces.find((f) => f.faceId === testFaceId1);

      expect(face).toBeDefined();
      expect(face).toHaveProperty("imageId", testImageId);
      expect(face).toHaveProperty("embedding"); // Check if embedding is returned
      expect(face).toHaveProperty("boundingBox");
      expect(face.boundingBox).toEqual({
        top: 10,
        left: 20,
        right: 50,
        left: 60,
      });
    });

    test("should return empty array if image has no detected faces", async () => {
      const createRes = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", faceslessImagePath);
      const noFaceImageId = createRes.body.data.images[0].imageId;

      const res = await agent
        .get(`${baseURL}/images/${noFaceImageId}/faces`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(res.body.data.faces)).toBe(true);
      expect(res.body.data.faces.length).toBe(0);

      if (noFaceImageId && Images && Images.deleteImageById) {
        await Images.deleteImageById(noFaceImageId);
      }
    });

    test("should fail without authentication", async () => {
      const res = await agent.get(`${baseURL}/images/${testImageId}/faces`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if image ID does not exist", async () => {
      const nonExistentImageId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .get(`${baseURL}/images/${nonExistentImageId}/faces`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Image not found.");
    });
  });
});
