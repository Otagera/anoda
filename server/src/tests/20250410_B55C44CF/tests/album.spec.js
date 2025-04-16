const {
  request,
  baseURL,
  Users,
  Albums,
  closeServerAsync,
  HTTP_STATUS_CODES,
} = require("../../common");

const testUser = {
  email: "album.prisma.user@email.com",
  password: "aA1.ValidPassword!@",
};
// 'album_name' is optional per schema,
// but we often require it at the application level. Test assumes application enforces presence.
const albumData1 = {
  albumName: "Summer Vacation 2025",
};
const albumData2 = {
  albumName: "Project Phoenix Docs",
};
const updatedAlbumData = {
  albumName: "Summer Vacation 2025 - Updated Pics",
};

const invalidAlbumData = {
  some_other_field: "irrelevant",
};

let agent;
let server;
let authToken;
let testUserId;

beforeAll(async () => {
  const common = require("../../common");
  server = common.server;
  agent = request.agent(server);

  const fetchedTestUser = await Users.fetchUserByEmail(testUser.email);
  if (fetchedTestUser) {
    await Users.deleteUserById(fetchedTestUser.user_id);
  }

  await agent.post(`${baseURL}/auth/signup`).send(testUser);

  const loginRes = await agent.post(`${baseURL}/auth/login`).send(testUser);
  authToken = loginRes.body.data.accessToken;

  const userDetails = await Users.fetchUserByEmail(testUser.email);
  if (!userDetails) {
    throw new Error(
      `Failed to find user ${testUser.email} after signup/login.`
    );
  }
  testUserId = userDetails.user_id;

  if (!authToken || !testUserId) {
    throw new Error(
      "Authentication/User setup failed, cannot retrieve token or user ID for tests."
    );
  }
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
      if (Albums.deleteAlbumsByUserId) {
        // Check if deleteAlbumsByUserId exists
        await Albums.deleteAlbumsByUserId(userIdToDelete);
      }
      if (Users.deleteUserById) {
        // Check if deleteUserById exists
        await Users.deleteUserById(userIdToDelete);
      }
    } else {
      console.warn("No testUserId found, skipping user/album cleanup.");
    }
  } catch (error) {
    // Log any errors during cleanup, but don't necessarily fail the test suite
    console.error("Error during afterAll cleanup:", error);
  } finally {
    await closeServerAsync(server);
  }
});

describe("/albums", () => {
  beforeEach(async () => {
    if (testUserId) {
      await Albums.deleteAlbumsByUserId(testUserId);
    }
  });

  describe("POST /albums", () => {
    test("should create a new album successfully", async () => {
      const res = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);

      expect(res.status).toBe(HTTP_STATUS_CODES.CREATED);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("Album created successfully.");
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data).toHaveProperty("albumName", albumData1.albumName);
      expect(res.body.data).toHaveProperty("userId", testUserId);
      expect(res.body.data).toHaveProperty("createdAt");
      // might be null
      expect(res.body.data).toHaveProperty("sharedLink");
    });

    test("should fail to create an album without authentication", async () => {
      const res = await agent.post(`${baseURL}/albums`).send(albumData1);

      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toMatch("Unauthorized request, please login");
      expect(res.body.data).toBe(null);
    });

    test("should fail to create an album without proper authentication", async () => {
      const res = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer authToken`)
        .send(albumData1);

      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      expect(res.body.status).toBe("error");
      expect(res.body.data).toBe(null);
    });

    test("should fail to create an album with missing album_name", async () => {
      const res = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(invalidAlbumData);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toMatch(
        /validation failed|album_name is required/i
      );
      //Album name: album_name is required
      expect(res.body.data).toBe(null);
    });
  });

  describe("GET /albums", () => {
    beforeEach(async () => {
      await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);
      await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData2);
    });

    test("should list all albums for the authenticated user", async () => {
      const res = await agent
        .get(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe("Albums retrieved successfully.");
      expect(Array.isArray(res.body.data.albums)).toBe(true);
      expect(res.body.data.albums.length).toBe(2);

      const firstAlbum = res.body.data.albums.find(
        (a) => a.albumName === albumData1.albumName
      );
      expect(firstAlbum).toBeDefined();
      expect(firstAlbum).toHaveProperty("id");
      expect(firstAlbum).toHaveProperty("userId", testUserId);
      expect(firstAlbum).toHaveProperty("createdAt");
      expect(firstAlbum).toHaveProperty("sharedLink");

      const names = res.body.data.albums.map((album) => album.albumName);
      expect(names).toContain(albumData1.albumName);
      expect(names).toContain(albumData2.albumName);
    });

    test("should return an empty array if the user has no albums", async () => {
      // Clear albums created by the nested beforeEach
      await Albums.deleteAlbumsByUserId(testUserId);

      const res = await agent
        .get(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(Array.isArray(res.body.data.albums)).toBe(true);
      expect(res.body.data.albums.length).toBe(0);
    });

    test("should fail to list albums without authentication", async () => {
      const res = await agent.get(`${baseURL}/albums`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });
  });

  describe("GET /albums/:albumId", () => {
    let testAlbumId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);
      testAlbumId = createRes.body.data.id;
      if (!testAlbumId)
        throw new Error("Failed to create album for GET /albums/:albumId test");
    });

    test("should view a specific album successfully", async () => {
      const res = await agent
        .get(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        `Album: ${testAlbumId} retrieved successfully.`
      );
      expect(res.body.data).toHaveProperty("id", testAlbumId);
      expect(res.body.data).toHaveProperty("albumName", albumData1.albumName);
      expect(res.body.data).toHaveProperty("userId", testUserId);
      expect(res.body.data).toHaveProperty("createdAt");
    });

    test("should fail to view an album without authentication", async () => {
      const res = await agent.get(`${baseURL}/albums/${testAlbumId}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if the album ID does not exist", async () => {
      // Generate a valid UUID format that likely doesn't exist
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .get(`${baseURL}/albums/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Album not found.");
    });
  });

  describe("PUT /albums/:albumId", () => {
    let testAlbumId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);

      testAlbumId = createRes.body.data.id;
      if (!testAlbumId) throw new Error("Failed to create album for PUT test");
    });

    test("should edit an album successfully", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedAlbumData);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        `Album: ${testAlbumId} updated successfully.`
      );
      expect(res.body.data).toHaveProperty("id", testAlbumId);
      expect(res.body.data).toHaveProperty(
        "albumName",
        updatedAlbumData.albumName
      );
      expect(res.body.data).toHaveProperty("userId", testUserId);

      // Verify update
      const getRes = await agent
        .get(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(getRes.body.data.albumName).toBe(updatedAlbumData.albumName);
    });

    test("should fail to edit an album without authentication", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${testAlbumId}`)
        .send(updatedAlbumData);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if trying to edit an album ID that does not exist", async () => {
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .put(`${baseURL}/albums/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(updatedAlbumData);
      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toBe("Album not found.");
    });

    test("should fail to edit an album with invalid data (e.g., empty albumName)", async () => {
      const res = await agent
        .put(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({ albumName: "" });

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toMatch("album_name is not allowed to be empty");
      // ... rest of error checks
    });
  });

  describe("DELETE /albums/:albumId", () => {
    let testAlbumId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);

      testAlbumId = createRes.body.data.id;
      if (!testAlbumId)
        throw new Error("Failed to create album for DELETE test");
    });

    test("should delete an album successfully", async () => {
      const res = await agent
        .delete(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(
        `Album: ${testAlbumId} deleted successfully.`
      );

      // Verify deletion
      const getRes = await agent
        .get(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(getRes.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
    });

    test("should fail to delete an album without authentication", async () => {
      const res = await agent.delete(`${baseURL}/albums/${testAlbumId}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
    });

    test("should return 404 if trying to delete an album ID that does not exist", async () => {
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .delete(`${baseURL}/albums/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      expect(res.body.message).toBe("Album not found.");
    });
  });

  describe("DELETE /albums/", () => {
    let testAlbumId;

    beforeEach(async () => {
      const createRes = await agent
        .post(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`)
        .send(albumData1);
      testAlbumId = createRes.body.data.id;
      if (!testAlbumId)
        throw new Error("Failed to create album for DELETE test");
    });

    test("should delete an album successfully", async () => {
      const res = await agent
        .delete(`${baseURL}/albums`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(HTTP_STATUS_CODES.OK);
      expect(res.body.status).toBe("completed");
      expect(res.body.message).toBe(`Albums deleted successfully.`);
      expect(res.body.data).toHaveProperty("count", 1);

      // Verify deletion
      const getRes = await agent
        .get(`${baseURL}/albums/${testAlbumId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(getRes.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
    });

    test("should fail to delete an album without authentication", async () => {
      const res = await agent.delete(`${baseURL}/albums`);
      expect(res.status).toBe(HTTP_STATUS_CODES.UNAUTHORIZED);
      // ... rest of error checks
    });

    test("should return 404 if trying to delete an album ID that does not exist", async () => {
      const nonExistentId = "123e4567-e89b-12d3-a456-426614174000";
      const res = await agent
        .delete(`${baseURL}/albums/${nonExistentId}`)
        .set("Authorization", `Bearer ${authToken}`);
      expect(res.status).toBe(HTTP_STATUS_CODES.NOTFOUND);
      // ... rest of error checks
      expect(res.body.message).toBe("Album not found.");
    });
  });
});
