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

describe("Faces Endpoints", () => {
  let testImageId;
  let testFaceId1;

  beforeAll(async () => {
    // Create an image to associate faces with
    const createRes = await agent
      .post(`${baseURL}/images`)
      .set("Authorization", `Bearer ${authToken}`)
      .attach("uploadedImages", sampleImagePath);
    console.log("createRes.status", createRes.status);
    console.log("createRes.body", createRes.body);

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
  describe("Advanced Image and Face Endpoint Tests", () => {
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
        if (!Faces || !Faces.createNewFace || !Images || !Images.uploadImage) {
          throw new Error(
            "Required helper functions (Faces/Images) are missing for face test setup."
          );
        }

        // Create 2 images
        const createdImage1 = await Images.uploadImage({
          image_path: "/path/face_img1.jpg",
          original_width: 200,
          original_height: 200,
        });
        const createdImage2 = await Images.uploadImage({
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
