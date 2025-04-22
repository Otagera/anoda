const {
  request,
  baseURL,
  Users,
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

let agent;
let server;
let authToken;
let testUserId;

beforeAll(async () => {
  const common = require("../../common");
  server = common.server;
  agent = request.agent(server);

  // Cleanup existing test user if present
  const fetchedTestUser = await Users.fetchUserByEmail(testUser.email);
  if (fetchedTestUser) {
    // Cascade delete or delete related data first
    await AlbumImages.deleteLinksByUserId(fetchedTestUser.user_id);
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
  describe("GET /images (List, Filter, Paginate)", () => {
    const NUM_IMAGES_LIST = 7; // Number of images for list tests
    const imagesDataList = []; // Store details of created images for verification
    let listAlbumId1, listAlbumId2;

    // Setup: Create multiple images and albums specifically for list tests
    beforeAll(async () => {
      // Ensure helpers are available
      if (
        !Albums ||
        !Albums.createNewAlbum ||
        !Images ||
        !Images.uploadImage ||
        !AlbumImages ||
        !AlbumImages.createAlbumImageLink
      ) {
        throw new Error(
          "Required helper functions (Albums/Images/AlbumImages) are missing for list test setup."
        );
      }

      if (!global.testUserId) {
        // Example check if testUserId is globally available
        const userDetails = await Users.fetchUserByEmail(testUser.email); // Fetch if needed
        global.testUserId = userDetails?.user_id;
      }
      if (!global.testUserId) {
        throw new Error("testUserId is not available for album creation.");
      }

      const albumData1 = {
        album_name: "List Test Album One",
        created_by: global.testUserId,
      };
      const albumData2 = {
        album_name: "List Test Album Two",
        created_by: global.testUserId,
      };

      const [createdAlbum1, createdAlbum2] = await Promise.all([
        Albums.createNewAlbum(albumData1),
        Albums.createNewAlbum(albumData2),
      ]);
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
          uploaded_by: testUserId,
        };
        const createdImage = await Images.uploadImage(imageData);

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
          await AlbumImages.createAlbumImageLink({
            album_id: assignedAlbumId,
            image_id: imgId,
          });
        }
        // Store images in the order they are created (assuming default sort is by creation time/ID)
        imagesDataList.push({
          image_id: imgId,
          assignedAlbumId: assignedAlbumId,
        });

        // Optional small delay if testing date filtering later
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });

    afterAll(async () => {
      // Use defensive checks for helpers before calling them
      for (const img of imagesDataList) {
        if (AlbumImages?.deleteLinksByImageId)
          await AlbumImages.deleteLinksByImageId(img.image_id);
        if (Images?.deleteImageById) await Images.deleteImageById(img.image_id);
      }
      if (Albums?.deleteAlbumById) {
        if (listAlbumId1) await Albums.deleteAlbumById(listAlbumId1);
        if (listAlbumId2) await Albums.deleteAlbumById(listAlbumId2);
      }
      imagesDataList.length = 0; // Clear array
    });

    describe("Offset Pagination", () => {
      test("GET /images - should list first page with default limit", async () => {
        console.log("defaultdefault");
        const res = await agent
          .get(`${baseURL}/images`)
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.status).toBe("completed");
        expect(Array.isArray(res.body.data.images)).toBe(true);
        expect(res.body.data.images.length).toBeGreaterThan(0);
        expect(res.body.data.images.length).toBeLessThanOrEqual(
          NUM_IMAGES_LIST
        );

        expect(res.body.data.pagination).toBeDefined();
        expect(res.body.data.pagination.hasNextPage).toBeDefined();
        expect(res.body.data.pagination.hasPreviousPage).toBeDefined();
        expect(res.body.data.pagination.total).toBe(NUM_IMAGES_LIST);
        expect(res.body.data.pagination.currentPage).toBe(1);
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
        expect(res.body.data.pagination.currentPage).toBe(page);
        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.totalPages).toBe(
          Math.ceil(NUM_IMAGES_LIST / limit)
        );
        expect(res.body.data.pagination.hasNextPage).toBeDefined();
        expect(res.body.data.pagination.hasPreviousPage).toBeDefined();

        const expectedStartIndex = (page - 1) * limit;
        expect(res.body.data.images[0].imageId).toBe(
          imagesDataList.sort((a, b) => a.image_id - b.image_id)[
            expectedStartIndex
          ].image_id
        );
        expect(res.body.data.images[1].imageId).toBe(
          imagesDataList.sort((a, b) => b.image_id - a.image_id)[
            expectedStartIndex + 1
          ].image_id
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
        expect(res.body.data.pagination.currentPage).toBe(page);
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
        ).length;
        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.data.images.length).toBe(limit); // Page 1 has 2 items
        expect(res.body.data.pagination.total).toBe(expectedTotalFiltered);
        expect(res.body.data.pagination.currentPage).toBe(page);
        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.totalPages).toBe(
          Math.ceil(expectedTotalFiltered / limit)
        );
      });
    });

    describe("Cursor Pagination", () => {
      // Assume API returns { data: { images: [], pagination: { nextCursor: '...', limit: X } } }
      // Assume cursor is based on image_id or a similar unique, sortable field

      /* test("GET /images - should list first page and return nextCursor", async () => {
        const limit = 3;
        const res = await agent
          .get(`${baseURL}/images?paginationType=cursor&limit=${limit}`) // No cursor for first page
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.OK);
        expect(res.body.status).toBe("completed");
        expect(Array.isArray(res.body.data.images)).toBe(true);
        expect(res.body.data.images.length).toBe(limit);
        expect(res.body.data.pagination).toBeDefined();

        expect(res.body.data.pagination.limit).toBe(limit);
        expect(res.body.data.pagination.nextCursor).toBeDefined();
        expect(res.body.data.pagination.nextCursor).not.toBeNull();
        expect(res.body.data.pagination.hasMoreItems).toBeDefined();
        expect(res.body.data.pagination.hasMoreItems).toBe(true);

        // Check items are the first 'limit' items from our created list
        expect(res.body.data.images[0].imageId).toBe(
          imagesDataList[0].image_id
        );
        expect(res.body.data.images[limit - 1].imageId).toBe(
          imagesDataList[limit - 1].image_id
        );
      }); */

      test("GET /images - should use nextCursor to get the second page", async () => {
        const limit = 3;

        // Fetch the first page
        const firstRes = await agent
          .get(`${baseURL}/images?paginationType=cursor&limit=${limit}`)
          .set("Authorization", `Bearer ${authToken}`);

        const nextCursor = firstRes.body.data.pagination.nextCursor;
        console.log(
          "firstRes.body.data.images.length:",
          firstRes.body.data.images.length
        );
        console.log("nextCursor from firstRes:", nextCursor);
        expect(nextCursor).toBeDefined();

        // Fetch the second page
        const secondRes = await agent
          .get(
            `${baseURL}/images?paginationType=cursor&limit=${limit}&nextCursor=${nextCursor}`
          )
          .set("Authorization", `Bearer ${authToken}`);

        console.log(
          "secondRes.body.data.images.length:",
          secondRes.body.data.images.length
        );
        console.log("secondRes.body:", secondRes.body);

        // Assertions
        expect(secondRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(secondRes.body.data.images.length).toBe(limit); // Should get the next 3 items
        expect(secondRes.body.data.pagination.limit).toBe(limit);
        expect(secondRes.body.data.pagination.nextCursor).toBeDefined();

        // Verify items are different from the first page
        const firstPageIds = firstRes.body.data.images.map(
          (img) => img.imageId
        );
        const secondPageIds = secondRes.body.data.images.map(
          (img) => img.imageId
        );
        console.log("firstPageIds:", firstPageIds);
        console.log("secondPageIds:", secondPageIds);

        expect(secondPageIds).not.toEqual(firstPageIds);
        expect(secondPageIds[0]).toBe(imagesDataList[limit].image_id); // First item after the first page
        expect(secondPageIds[limit - 1]).toBe(
          imagesDataList[limit * 2 - 1].image_id
        );
      });

      /* test("GET /images - should reach the end of the list (nextCursor is null)", async () => {
        const limit = 4;

        const firstRes = await agent
          .get(`${baseURL}/images?paginationType=cursor&limit=${limit}`)
          .set("Authorization", `Bearer ${authToken}`);
        const cursor1 = firstRes.body.data.pagination.nextCursor;
        expect(cursor1).toBeDefined();
        expect(firstRes.body.data.images.length).toBe(limit); // 4 items

        const secondRes = await agent
          .get(
            `${baseURL}/images?paginationType=cursor&limit=${limit}&nextCursor=${cursor1}`
          )
          .set("Authorization", `Bearer ${authToken}`);
        expect(secondRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(secondRes.body.data.images.length).toBe(NUM_IMAGES_LIST - limit); // Remaining 3 items
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

        const firstRes = await agent
          .get(
            `${baseURL}/images?paginationType=cursor&albumId=${listAlbumId1}&limit=${limit}`
          )
          .set("Authorization", `Bearer ${authToken}`);

        expect(firstRes.status).toBe(HTTP_STATUS_CODES.OK);
        expect(firstRes.body.data.images.length).toBe(limit);
        const nextCursor = firstRes.body.data.pagination.nextCursor;
        expect(nextCursor).toBeDefined();

        // Verify items belong to the album
        firstRes.body.data.images.forEach((img) => {
          const originalData = imagesDataList.find(
            (d) => d.image_id === img.image_id
          );
          expect(originalData.assignedAlbumId).toBe(listAlbumId1);
        });

        const secondRes = await agent
          .get(
            `${baseURL}/images?paginationType=cursor&albumId=${listAlbumId1}&limit=${limit}&cursor=${nextCursor}`
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
          .get(
            `${baseURL}/images?paginationType=cursor&limit=${limit}&cursor=${invalidCursor}`
          )
          .set("Authorization", `Bearer ${authToken}`);

        expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
        expect(res.body.message).toMatch(/Invalid cursor|Pagination error/i);
      }); */
    });

    test("GET /images - should fail without authentication", async () => {
      const res = await agent.get(`${baseURL}/images`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });
  });
});
