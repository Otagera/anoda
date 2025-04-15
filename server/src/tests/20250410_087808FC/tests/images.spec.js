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
  /* 
  // --- GET /images with Filtering and Pagination ---
  describe("GET /images (List, Filter, Paginate)", () => {
    const NUM_IMAGES_LIST = 7; // Number of images for list tests
    const imagesDataList = []; // Store details of created images for verification
    let listAlbumId1, listAlbumId2;

    // Setup: Create multiple images and albums specifically for list tests
    beforeAll(async () => {
      // Ensure helpers are available
      if (
        !Albums ||
        !Albums.createAlbum ||
        !Images ||
        !Images.createImage ||
        !AlbumImages ||
        !AlbumImages.linkImageToAlbum
      ) {
        throw new Error(
          "Required helper functions (Albums/Images/AlbumImages) are missing for list test setup."
        );
      }

      // Create two albums
      // Ensure testUserId is defined from a higher scope or fetched here
      if (!global.testUserId) {
        // Example check if testUserId is globally available
        const userDetails = await Users.fetchUserByEmail(testUser.email); // Fetch if needed
        global.testUserId = userDetails?.user_id;
      }
      if (!global.testUserId) {
        throw new Error("testUserId is not available for album creation.");
      }

      const albumData1 = {
        albumName: "List Test Album One",
        userId: global.testUserId,
      };
      const albumData2 = {
        albumName: "List Test Album Two",
        userId: global.testUserId,
      };
      const createdAlbum1 = await Albums.createAlbum(albumData1);
      const createdAlbum2 = await Albums.createAlbum(albumData2);
      listAlbumId1 = createdAlbum1.album_id;
      listAlbumId2 = createdAlbum2.album_id;

      if (!listAlbumId1 || !listAlbumId2)
        throw new Error("Failed to create albums for listing tests.");

      // Create images and link some to albums
      for (let i = 0; i < NUM_IMAGES_LIST; i++) {
        // Simulate image creation (replace with actual API call or helper)
        // Ensure image creation associates with the user if necessary for retrieval logic
        const imageData = {
          image_path: `/path/to/image_${Date.now()}_${i}.jpg`, // Mock path
          original_width: 100,
          original_height: 100,
          // Add userId if your helper/logic requires it for ownership/retrieval
          // userId: testUserId
        };
        const createdImage = await Images.createImage(imageData);
        const imgId = createdImage.image_id;
        let assignedAlbumId = null;

        // Assign first few to album 1, next few to album 2
        if (i < 3) {
          // First 3 in Album 1
          assignedAlbumId = listAlbumId1;
        } else if (i < 5) {
          // Next 2 in Album 2
          assignedAlbumId = listAlbumId2;
        } // Remaining 2 are not in any album

        if (assignedAlbumId) {
          // Link image to album using helper
          await AlbumImages.linkImageToAlbum(assignedAlbumId, imgId);
        }
        // Store images in the order they are created (assuming default sort is by creation time/ID)
        imagesDataList.push({
          image_id: imgId,
          assignedAlbumId: assignedAlbumId,
        });
        // Optional small delay if testing date filtering later
        // await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    // Cleanup: Remove images and albums created for these tests
    afterAll(async () => {
      // Use defensive checks for helpers before calling them
      for (const img of imagesDataList) {
        if (AlbumImages?.deleteLinksByImageId)
          await AlbumImages.deleteLinksByImageId(img.image_id);
        if (Images?.deleteImageById)
          await Images.deleteImageById(img.image_id);
      }
      if (Albums?.deleteAlbumById) {
        if (listAlbumId1) await Albums.deleteAlbumById(listAlbumId1);
        if (listAlbumId2) await Albums.deleteAlbumById(listAlbumId2);
      }
      imagesDataList.length = 0; // Clear array
    });

    // --- Offset Pagination Tests ---
    describe("Offset Pagination", () => {
      test("GET /images - should list first page with default limit", async () => {
        const res = await agent
          .get(`${baseURL}/images`) // No pagination params
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.status).toBe("completed");
        expect(Array.isArray(res.body.data.images)).toBe(true);
        expect(res.body.data.images.length).toBeGreaterThan(0);
        expect(res.body.data.images.length).toBeLessThanOrEqual(
          NUM_IMAGES_LIST
        );
        expect(res.body.data.pagination).toBeDefined();
        // For offset, expect page, total, limit, totalPages
        expect(res.body.data.pagination.total).toBe(NUM_IMAGES_LIST);
        expect(res.body.data.pagination.page).toBe(1);
        expect(res.body.data.pagination.limit).toBeDefined();
        expect(res.body.data.pagination.totalPages).toBeDefined();
      });

      test("GET /images - should paginate correctly (limit=2, page=2)", async () => {
        const limit = 2;
        const page = 2;
        const res = await agent
          .get(`${baseURL}/images?limit=${limit}&page=${page}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.data.images.length).toBe(limit);
        expect(res.body.data.pagination.total).toBe(NUM_IMAGES_LIST);
        expect(res.body.data.pagination.page).toBe(page);
        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.totalPages).toBe(
          Math.ceil(NUM_IMAGES_LIST / limit)
        );

        // Verify correct items are returned (indices 2 and 3 assuming default sort order)
        const expectedStartIndex = (page - 1) * limit;
        expect(res.body.data.images[0].image_id).toBe(
          imagesDataList[expectedStartIndex].image_id
        );
        expect(res.body.data.images[1].image_id).toBe(
          imagesDataList[expectedStartIndex + 1].image_id
        );
      });

      test("GET /images - should return empty list for page beyond total", async () => {
        const limit = 3;
        const totalPages = Math.ceil(NUM_IMAGES_LIST / limit);
        const page = totalPages + 1;
        const res = await agent
          .get(`${baseURL}/images?limit=${limit}&page=${page}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.data.images.length).toBe(0);
        expect(res.body.data.pagination.page).toBe(page);
        expect(res.body.data.pagination.total).toBe(NUM_IMAGES_LIST);
      });

      test("GET /images - should filter by albumId and paginate (offset)", async () => {
        const limit = 2;
        const page = 1;
        const res = await agent
          .get(
            `${baseURL}/images?albumId=${listAlbumId1}&limit=${limit}&page=${page}`
          )
          .set("Authorization", `Bearer ${authToken}`);

        const expectedTotalFiltered = imagesDataList.filter(
          (img) => img.assignedAlbumId === listAlbumId1
        ).length; // 3
        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.data.images.length).toBe(limit); // Page 1 has 2 items
        expect(res.body.data.pagination.total).toBe(expectedTotalFiltered);
        expect(res.body.data.pagination.page).toBe(page);
        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.totalPages).toBe(
          Math.ceil(expectedTotalFiltered / limit)
        ); // 2 pages total
      });
    }); // End describe("Offset Pagination")

    // --- Cursor Pagination Tests ---
    describe("Cursor Pagination", () => {
      // Assume API returns { data: { images: [], pagination: { nextCursor: '...', limit: X } } }
      // Assume cursor is based on image_id or a similar unique, sortable field

      test("GET /images - should list first page and return nextCursor", async () => {
        const limit = 3;
        const res = await agent
          .get(`${baseURL}/images?limit=${limit}`) // No cursor for first page
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.status).toBe("completed");
        expect(Array.isArray(res.body.data.images)).toBe(true);
        expect(res.body.data.images.length).toBe(limit);
        expect(res.body.data.pagination).toBeDefined();
        // For cursor, expect nextCursor (if more items exist) and limit
        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.nextCursor).toBeDefined(); // Expect a cursor for the next page
        expect(res.body.data.pagination.nextCursor).not.toBeNull();

        // Check items are the first 'limit' items from our created list
        expect(res.body.data.images[0].image_id).toBe(
          imagesDataList[0].image_id
        );
        expect(res.body.data.images[limit - 1].image_id).toBe(
          imagesDataList[limit - 1].image_id
        );
      });

      test("GET /images - should use nextCursor to get the second page", async () => {
        const limit = 3;
        // Step 1: Get the first page to obtain a cursor
        const firstRes = await agent
          .get(`${baseURL}/images?limit=${limit}`)
          .set("Authorization", `Bearer ${authToken}`);
        const nextCursor = firstRes.body.data.pagination.nextCursor;
        expect(nextCursor).toBeDefined();

        // Step 2: Use the cursor to get the second page
        const secondRes = await agent
          .get(`${baseURL}/images?limit=${limit}&cursor=${nextCursor}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(secondRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(secondRes.body.data.images.length).toBe(limit); // Should get the next 3 items
        expect(secondRes.body.data.pagination.limit).toBe(limit);
        expect(secondRes.body.data.pagination.nextCursor).toBeDefined(); // Still more items

        // Verify items are different from the first page and are the expected next items
        const firstPageIds = firstRes.body.data.images.map(
          (img) => img.image_id
        );
        const secondPageIds = secondRes.body.data.images.map(
          (img) => img.image_id
        );
        expect(secondPageIds).not.toEqual(firstPageIds);
        expect(secondPageIds[0]).toBe(imagesDataList[limit].image_id); // Item after the first page
        expect(secondPageIds[limit - 1]).toBe(
          imagesDataList[limit * 2 - 1].image_id
        );
      });

      test("GET /images - should reach the end of the list (nextCursor is null)", async () => {
        const limit = 4; // Choose limit such that 2 pages cover all items
        // Page 1
        const firstRes = await agent
          .get(`${baseURL}/images?limit=${limit}`)
          .set("Authorization", `Bearer ${authToken}`);
        const cursor1 = firstRes.body.data.pagination.nextCursor;
        expect(cursor1).toBeDefined();
        expect(firstRes.body.data.images.length).toBe(limit); // 4 items

        // Page 2 (should contain the remaining 3 items)
        const secondRes = await agent
          .get(`${baseURL}/images?limit=${limit}&cursor=${cursor1}`)
          .set("Authorization", `Bearer ${authToken}`);
        expect(secondRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(secondRes.body.data.images.length).toBe(
          NUM_IMAGES_LIST - limit
        ); // Remaining 3 items
        expect(secondRes.body.data.pagination.limit).toBe(limit);
        // End of list, nextCursor should be null or absent
        expect(secondRes.body.data.pagination.nextCursor).toBeNull(); // Or check if property is absent

        // Verify the last item matches the last created item
        expect(
          secondRes.body.data.images[secondRes.body.data.images.length - 1]
            .image_id
        ).toBe(imagesDataList[NUM_IMAGES_LIST - 1].image_id);
      });

      test("GET /images - should filter by albumId and paginate with cursor", async () => {
        const limit = 2;
        const expectedFilteredCount = imagesDataList.filter(
          (img) => img.assignedAlbumId === listAlbumId1
        ).length; // 3

        // Page 1 of filtered results
        const firstRes = await agent
          .get(`${baseURL}/images?albumId=${listAlbumId1}&limit=${limit}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(firstRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(firstRes.body.data.images.length).toBe(limit); // 2 items
        const nextCursor = firstRes.body.data.pagination.nextCursor;
        expect(nextCursor).toBeDefined(); // Should have a next page

        // Verify items belong to the album
        firstRes.body.data.images.forEach((img) => {
          const originalData = imagesDataList.find(
            (d) => d.image_id === img.image_id
          );
          expect(originalData.assignedAlbumId).toBe(listAlbumId1);
        });

        // Page 2 of filtered results
        const secondRes = await agent
          .get(
            `${baseURL}/images?albumId=${listAlbumId1}&limit=${limit}&cursor=${nextCursor}`
          )
          .set("Authorization", `Bearer ${authToken}`);

        expect(secondRes.status).toBe(HTTP_STATUS_CODES.OK);
        // Should contain the remaining item(s)
        expect(secondRes.body.data.images.length).toBe(
          expectedFilteredCount - limit
        ); // 1 item
        expect(secondRes.body.data.pagination.nextCursor).toBeNull(); // End of filtered list

        // Verify the last item belongs to the album
        const originalData = imagesDataList.find(
          (d) => d.image_id === secondRes.body.data.images[0].image_id
        );
        expect(originalData.assignedAlbumId).toBe(listAlbumId1);
      });

      test("GET /images - should return 400 for invalid cursor format", async () => {
        const limit = 3;
        const invalidCursor = "this-is-not-a-valid-cursor";
        const res = await agent
          .get(`${baseURL}/images?limit=${limit}&cursor=${invalidCursor}`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
        expect(res.body.message).toMatch(/Invalid cursor|Pagination error/i);
      });
    }); // End describe("Cursor Pagination")

    // --- Common Tests (Apply to both pagination types) ---
    test("GET /images - should filter images by albumId (basic check)", async () => {
      // This test remains valid regardless of pagination type, checking filtering logic
      const res = await agent
        .get(`${baseURL}/images?albumId=${listAlbumId1}`)
        .set("Authorization", `Bearer ${authToken}`);

      const expectedCount = imagesDataList.filter(
        (img) => img.assignedAlbumId === listAlbumId1
      ).length;
      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      // Check against default limit or total filtered count if pagination isn't forced
      expect(res.body.data.images.length).toBe(expectedCount);
      // Pagination total (if present) should reflect filtered count
      if (res.body.data.pagination?.total !== undefined) {
        expect(res.body.data.pagination.total).toBe(expectedCount);
      }
    });

    test("GET /images - should return empty list when filtering by non-existent albumId", async () => {
      const nonExistentAlbumId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .get(`${baseURL}/images?albumId=${nonExistentAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.data.images.length).toBe(0);
      if (res.body.data.pagination?.total !== undefined) {
        expect(res.body.data.pagination.total).toBe(0);
      }
    });

    test("GET /images - should fail without authentication", async () => {
      const res = await agent.get(`${baseURL}/images`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });
  }); // --- End of GET /images list tests ---
 */
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

  /* describe("Advanced Image and Face Endpoint Tests", () => {
    

    // --- Faces Endpoint Tests ---
    describe("Faces Endpoints (Get Specific / Search)", () => {
      // Setup for faces: Requires images and manually created face records
      const faceTestData = {
        imageIds: [],
        faceDetails: {}, // Stores faceId -> { image_id, embedding, bbox, personId }
      };

      // Mock embeddings - simple arrays for logical distance/similarity testing
      const embeddingP1_1 = [0.1, 0.2, 0.1]; // Person 1, Face 1
      const embeddingP1_2 = [0.11, 0.21, 0.11]; // Person 1, Face 2 (similar)
      const embeddingP2_1 = [0.8, 0.1, 0.3]; // Person 2, Face 1 (different)
      const embeddingP3_1 = [0.5, 0.5, 0.9]; // Person 3, Face 1 (different)

      const bbox1 = { x: 10, y: 10, w: 50, h: 50 };
      const bbox2 = { x: 100, y: 10, w: 40, h: 40 };
      const bbox3 = { x: 10, y: 100, w: 60, h: 60 };

      beforeAll(async () => {
        // Ensure helpers are available
        if (!Faces || !Faces.createNewFace || !Images || !Images.createImage) {
          throw new Error(
            "Required helper functions (Faces/Images) are missing for face test setup."
          );
        }

        // Create 2 images
        const createdImage1 = await Images.createImage({
          image_path: "/path/face_img1.jpg",
          original_width: 200,
          original_height: 200,
        });
        const createdImage2 = await Images.createImage({
          image_path: "/path/face_img2.jpg",
          original_width: 200,
          original_height: 200,
        });
        const imgId1 = createdImage1.image_id;
        const imgId2 = createdImage2.image_id;
        faceTestData.imageIds.push(imgId1, imgId2);

        if (!imgId1 || !imgId2)
          throw new Error("Failed to create images for face tests.");

        // Manually create face records simulating detection results
        // Image 1: Person 1 (face A), Person 2 (face B)
        const faceA = await Faces.createNewFace({
          image_id: imgId1,
          embedding: embeddingP1_1,
          bounding_box: bbox1,
        });
        const faceB = await Faces.createNewFace({
          image_id: imgId1,
          embedding: embeddingP2_1,
          bounding_box: bbox2,
        });
        // Image 2: Person 1 (face C), Person 3 (face D)
        const faceC = await Faces.createNewFace({
          image_id: imgId2,
          embedding: embeddingP1_2,
          bounding_box: bbox1,
        }); // Similar to face A
        const faceD = await Faces.createNewFace({
          image_id: imgId2,
          embedding: embeddingP3_1,
          bounding_box: bbox3,
        });

        if (
          !faceA?.face_id ||
          !faceB?.face_id ||
          !faceC?.face_id ||
          !faceD?.face_id
        ) {
          console.error("Face creation results:", {
            faceA,
            faceB,
            faceC,
            faceD,
          });
          throw new Error("Failed to create mock face data.");
        }

        // Store details for easy access in tests
        faceTestData.faceDetails[faceA.face_id] = {
          face_id: faceA.face_id,
          image_id: imgId1,
          embedding: embeddingP1_1,
          bbox: bbox1,
          personId: 1,
        };
        faceTestData.faceDetails[faceB.face_id] = {
          face_id: faceB.face_id,
          image_id: imgId1,
          embedding: embeddingP2_1,
          bbox: bbox2,
          personId: 2,
        };
        faceTestData.faceDetails[faceC.face_id] = {
          face_id: faceC.face_id,
          image_id: imgId2,
          embedding: embeddingP1_2,
          bbox: bbox1,
          personId: 1,
        };
        faceTestData.faceDetails[faceD.face_id] = {
          face_id: faceD.face_id,
          image_id: imgId2,
          embedding: embeddingP3_1,
          bbox: bbox3,
          personId: 3,
        };
      });

      afterAll(async () => {
        // Clean up faces and images
        for (const faceId in faceTestData.faceDetails) {
          if (Faces?.deleteFaceById)
            await Faces.deleteFaceById(parseInt(faceId));
        }
        for (const imgId of faceTestData.imageIds) {
          if (Images?.deleteImageById) await Images.deleteImageById(imgId);
        }
        faceTestData.imageIds.length = 0;
        faceTestData.faceDetails = {};
      });

      // --- GET /faces/:faceId ---
      describe("GET /faces/:faceId", () => {
        let testFaceId; // Use Face A for tests

        beforeAll(() => {
          // Find Face A's ID (Person 1, Image 1)
          testFaceId = Object.values(faceTestData.faceDetails).find(
            (f) => f.personId === 1 && f.image_id === faceTestData.imageIds[0]
          )?.face_id;
          if (!testFaceId)
            throw new Error(
              "Could not find testFaceId for GET /faces/:faceId tests"
            );
        });

        test("should retrieve a specific face by ID", async () => {
          const res = await agent
            .get(`${baseURL}/faces/${testFaceId}`)
            .set("Authorization", `Bearer ${authToken}`);

          expect(res.status).toBe(HTTP_STATUS_CODES.OK);
          expect(res.body.status).toBe("completed");
          expect(res.body.data).toHaveProperty("face_id", testFaceId);
          expect(res.body.data).toHaveProperty(
            "image_id",
            faceTestData.imageIds[0]
          ); // Image 1
          expect(res.body.data).toHaveProperty("embedding"); // Check presence
          expect(res.body.data).toHaveProperty("bounding_box", bbox1); // Face A used bbox1
        });

        test("should fail without authentication", async () => {
          const res = await agent.get(`${baseURL}/faces/${testFaceId}`);
          expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
        });

        test("should return 404 for non-existent face ID", async () => {
          const nonExistentFaceId = 999999;
          const res = await agent
            .get(`${baseURL}/faces/${nonExistentFaceId}`)
            .set("Authorization", `Bearer ${authToken}`);
          expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
          expect(res.body.message).toBe("Face not found.");
        });

        test("should return 400 for invalid face ID format", async () => {
          const invalidFaceId = "not-a-number";
          const res = await agent
            .get(`${baseURL}/faces/${invalidFaceId}`)
            .set("Authorization", `Bearer ${authToken}`);
          expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
          expect(res.body.message).toMatch(
            /Invalid face ID format|Validation failed/i
          );
        });
      });

      // --- POST /faces/search ---
      describe("POST /faces/search", () => {
        let faceIdP1_Img1, faceIdP1_Img2, faceIdP2_Img1, faceIdP3_Img2;

        beforeAll(() => {
          // Get specific face IDs created in the outer beforeAll
          faceIdP1_Img1 = Object.values(faceTestData.faceDetails).find(
            (f) => f.personId === 1 && f.image_id === faceTestData.imageIds[0]
          )?.face_id;
          faceIdP2_Img1 = Object.values(faceTestData.faceDetails).find(
            (f) => f.personId === 2
          )?.face_id;
          faceIdP1_Img2 = Object.values(faceTestData.faceDetails).find(
            (f) => f.personId === 1 && f.image_id === faceTestData.imageIds[1]
          )?.face_id;
          faceIdP3_Img2 = Object.values(faceTestData.faceDetails).find(
            (f) => f.personId === 3
          )?.face_id;

          if (
            !faceIdP1_Img1 ||
            !faceIdP1_Img2 ||
            !faceIdP2_Img1 ||
            !faceIdP3_Img2
          ) {
            throw new Error(
              "Could not find all necessary face IDs for search tests"
            );
          }
        });

        test("should find similar faces based on faceId", async () => {
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ faceId: faceIdP1_Img1 }); // Search using Face A (P1, Img1)

          expect(res.status).toBe(HTTP_STATUS_CODES.OK);
          expect(res.body.status).toBe("completed");
          expect(Array.isArray(res.body.data.results)).toBe(true);

          // Should find Face C (P1, Img2) because embeddings are similar
          expect(res.body.data.results.length).toBe(1);
          const match = res.body.data.results[0];
          expect(match).toHaveProperty("face_id", faceIdP1_Img2);
          expect(match).toHaveProperty(
            "image_id",
            faceTestData.faceDetails[faceIdP1_Img2].image_id
          ); // Image 2
          expect(match).toHaveProperty("similarity_score");
          // Check score is high (exact value depends on similarity function)
          expect(match.similarity_score).toBeGreaterThan(0.9); // Adjust based on mock data/function

          // Ensure unrelated faces are NOT present
          const resultIds = res.body.data.results.map((r) => r.face_id);
          expect(resultIds).not.toContain(faceIdP1_Img1); // Exclude self
          expect(resultIds).not.toContain(faceIdP2_Img1); // Exclude P2
          expect(resultIds).not.toContain(faceIdP3_Img2); // Exclude P3
        });

        test("should return empty results if no similar faces found", async () => {
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ faceId: faceIdP3_Img2 }); // Search using Face D (P3, Img2) - no other P3 faces

          expect(res.status).toBe(HTTP_STATUS_CODES.OK);
          expect(res.body.data.results.length).toBe(0);
        });

        test("should respect limit parameter", async () => {
          // If Person 1 had 3+ faces, this test would be more meaningful.
          // As is, searching for P1 will only find 1 other face anyway.
          // Let's test limit=0 (though usually limit=1 is minimum practical)
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ faceId: faceIdP1_Img1, limit: 0 });

          expect(res.status).toBe(HTTP_STATUS_CODES.OK);
          expect(res.body.data.results.length).toBe(0); // Limit 0 should return none
        });

        test("should respect threshold parameter", async () => {
          // Search for P1 with a threshold higher than the actual similarity
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ faceId: faceIdP1_Img1, threshold: 0.99 }); // Assume similarity(P1_1, P1_2) < 0.99

          expect(res.status).toBe(HTTP_STATUS_CODES.OK);
          expect(res.body.data.results.length).toBe(0); // Expect no matches above the high threshold
        });

        test("should fail without authentication", async () => {
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .send({ faceId: faceIdP1_Img1 });
          expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
        });

        test("should fail if faceId is missing in request body", async () => {
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({}); // Empty body
          expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
          expect(res.body.message).toMatch(/faceId is required/i);
        });

        test("should return 404 if search faceId does not exist", async () => {
          const nonExistentFaceId = 999999;
          const res = await agent
            .post(`${baseURL}/faces/search`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({ faceId: nonExistentFaceId });
          expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
          expect(res.body.message).toBe("Face not found.");
        });
          });
          });
  
      });
  
      });
  
      });
  
    });
  }); */
});
