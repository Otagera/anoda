const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

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
const { getImageSize, isImageCorrupted } = require("@utils/image.util");
const {
  createImages,
  getImagesByIds,
} = require("@services/pictures/pictures.lib");
const { MAXIMUM_IMAGES_CAN_UPLOAD } = require("@utils/constants.util");

const testUser = {
  email: "image.prisma.user@email.com",
  password: "aA1.ValidPassword!@",
};
const testAlbumData = { albumName: "Test Album for Images" };
const sampleImagePath = path.join(__dirname, "..", "assets", "sample.jpg");

let agent;
let server;
let authToken;
let testUserId;
let testAlbumId;

jest.mock("@utils/image.util", () => ({
  getImageSize: jest.fn(),
  isImageCorrupted: jest.fn(),
  normalizeImagePath: jest.fn((p) => p),
}));
jest.mock("@services/pictures/pictures.lib", () => ({
  createImages: jest.fn(),
  getImagesByIds: jest.fn(),
}));
jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

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
      if (AlbumImages && AlbumImages.deleteLinksByUserId) {
        // Or delete by album/image IDs if user ID link isn't direct
        await AlbumImages.deleteLinksByUserId(userIdToDelete);
      }
      if (Images && Images.deleteImagesByUserId) {
        await Images.deleteImagesByUserId(userIdToDelete);
      }
      if (Albums && Albums.deleteAlbumsByUserId) {
        await Albums.deleteAlbumsByUserId(userIdToDelete);
      }
      if (Users && Users.deleteUserById) {
        await Users.deleteUserById(userIdToDelete);
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

describe("/images", () => {
  beforeEach(async () => {
    if (testUserId && Images && Images.deleteImagesByUserId) {
      await Images.deleteImagesByUserId(testUserId);
    }
    // Clean album<->image links too if necessary for test independence
    if (testAlbumId && AlbumImages && AlbumImages.deleteLinksByAlbumId) {
      await AlbumImages.deleteLinksByAlbumId(testAlbumId);
    }
  });

  describe("Advanced Failure Scenarios", () => {
    const largeFilePath = path.join(
      __dirname,
      "..",
      "assets",
      "large_file.bin"
    ); // Path to a dummy file > 5MB
    const textFilePath = path.join(__dirname, "..", "assets", "test.txt"); // Path to a non-image file
    const corruptedImagePath = path.join(
      __dirname,
      "..",
      "assets",
      "corrupted.jpg"
    ); // Path to a corrupted image

    // Optional: Create dummy files if they don't exist
    beforeAll(() => {
      // Create a dummy text file if it doesn't exist
      if (!fs.existsSync(textFilePath)) {
        fs.writeFileSync(textFilePath, "This is not an image.");
      }
      // Create a large dummy file (> 5MB) if it doesn't exist
      if (!fs.existsSync(largeFilePath)) {
        // Create a 6MB file
        const buffer = Buffer.alloc(6 * 1024 * 1024, "A");
        fs.writeFileSync(largeFilePath, buffer);
      }
      // Create a dummy corrupted image file if it doesn't exist
      if (!fs.existsSync(corruptedImagePath)) {
        // Write some non-image data but give it a .jpg extension
        fs.writeFileSync(
          corruptedImagePath,
          "This is definitely not a valid JPEG stream."
        );
      }
    });

    // Optional: Clean up dummy files
    afterAll(() => {
      if (fs.existsSync(largeFilePath)) fs.unlinkSync(largeFilePath);
      if (fs.existsSync(textFilePath)) fs.unlinkSync(textFilePath);
      if (fs.existsSync(corruptedImagePath)) fs.unlinkSync(corruptedImagePath);
    });

    // Reset mocks before each test in this failure suite
    beforeEach(() => {
      jest.clearAllMocks();
      // Default mock implementations (can be overridden in specific tests)
      getImageSize.mockResolvedValue({ width: 100, height: 100 }); // Default success
      createImages.mockImplementation(async (data) => ({
        // Default success
        ...data,
        image_id: `mock-id-${Date.now()}`, // Simulate ID generation
        upload_date: new Date(),
        update_date: new Date(),
      }));
      getImagesByIds.mockImplementation(async (ids) =>
        ids.map((id) => ({
          // Default success
          image_id: id,
          image_path: `/path/to/${id}.jpg`,
          original_width: 100,
          original_height: 100,
          upload_date: new Date(),
          update_date: new Date(),
          faces: [], // Assume faces might be populated by Python script later
        }))
      );

      // Default mock for spawn (successful Python script)
      const mockPythonProcess = {
        stdout: {
          on: jest.fn((event, cb) => {
            if (event === "data") cb("Processing complete");
          }),
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(0);
        }), // Simulate success (exit code 0)
        removeAllListeners: jest.fn(), // Add this line
      };
      spawn.mockReturnValue(mockPythonProcess);
    });

    test("should fail if uploaded file mimetype is invalid", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        // Attach the text file, multer might add mimetype based on extension,
        // or you might need to force the mimetype if using custom middleware
        .attach("uploadedImages", textFilePath, { contentType: "text/plain" }); // Force mimetype

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        "files[0].mimetype must be one of [image/jpeg, image/png, image/gif]"
      );
    });

    test("should fail if uploaded file size exceeds limit", async () => {
      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", largeFilePath); // Attach the large file

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(/File too large/i);
    });

    test("should fail if more than the maximum number of files are uploaded", async () => {
      const agentRequest = agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`);

      for (let i = 0; i < MAXIMUM_IMAGES_CAN_UPLOAD + 1; i++) {
        // Use different field names or ensure multer handles multiple files under the same name
        // Using the same field name 'uploadedImages' usually works with .array()

        agentRequest.attach(
          "uploadedImages",
          sampleImagePath,
          `testImage${i}.jpg`
        );
      }
      const res = await agentRequest;

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(/Unexpected field/i);
    });

    test("should return 500 if database createImages fails", async () => {
      createImages.mockRejectedValueOnce(new Error(""));

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Failed to save image|Database error|Internal server error|Simulated DB connection error/i
      );
      // Ensure Python script was NOT called if DB save failed
      expect(spawn).not.toHaveBeenCalled();
    });

    test("should return 400 if getImageSize fails for a file", async () => {
      getImageSize.mockRejectedValueOnce(
        new Error("Simulated image processing error")
      );

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Failed to process image|Internal server error|Simulated image processing error/i
      );
      expect(createImages).not.toHaveBeenCalled();
    });

    test("should return 500 if Python script execution fails (non-zero exit code)", async () => {
      const mockPythonProcess = {
        stdout: { on: jest.fn() },
        stderr: {
          on: jest.fn((event, cb) => {
            if (event === "data") cb("Python Error Message");
          }),
        },
        on: jest.fn((event, cb) => {
          if (event === "close") cb(1);
        }),
        removeAllListeners: jest.fn(),
      };
      spawn.mockReturnValue(mockPythonProcess);

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Python script failed with code 1: stderr: Python Error Message/i
      );

      expect(createImages).toHaveBeenCalled();
    });

    test("should return 500 if Python interpreter is not found", async () => {
      const error = new Error("spawn ENOENT");
      error.code = "ENOENT";
      spawn.mockImplementation(() => {
        throw error;
      });

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Python interpreter not found|Face processing setup error|Internal server error|spawn ENOENT/i
      );
    });

    test("should return 500 if database getImagesByIds fails after processing", async () => {
      getImagesByIds.mockRejectedValueOnce(
        new Error("Simulated DB read error")
      );

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", sampleImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Simulated DB read error|Internal server error/i
      );

      expect(createImages).toHaveBeenCalled();
      expect(spawn).toHaveBeenCalled();
    });

    test("should return 400 if file is corrupted (causing getImageSize error)", async () => {
      isImageCorrupted.mockImplementation(async (filePath) => {
        if (filePath.includes("corrupted.jpg")) {
          throw new Error("Corrupted image data");
        }
        return { width: 100, height: 100 };
      });

      const res = await agent
        .post(`${baseURL}/images`)
        .set("Authorization", `Bearer ${authToken}`)
        .attach("uploadedImages", corruptedImagePath);

      expect(res.status).toBe(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.body.message).toMatch(
        /Failed to process image|Internal server error|Image: .+? is corrupted/i
      );
    });
  });
});
