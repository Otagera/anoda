const createAlbumService = require("@services/albums/createAlbum.service");
const createAlbumHandler = require("@routes/handlers/albums/createAlbum.handler");

const updateAlbumService = require("@services/albums/updateAlbum.service");
const updateAlbumHandler = require("@routes/handlers/albums/updateAlbum.handler");

const fetchAlbumService = require("@services/albums/fetchAlbum.service");
const fetchAlbumHandler = require("@routes/handlers/albums/fetchAlbum.handler");

const fetchAlbumsService = require("@services/albums/fetchAlbums.service");
const fetchAlbumsHandler = require("@routes/handlers/albums/fetchAlbums.handler");

const deleteAlbumService = require("@services/albums/deleteAlbum.service");
const deleteAlbumHandler = require("@routes/handlers/albums/deleteAlbum.handler");

const { HTTP_STATUS_CODES } = require("@utils/constants.util");

jest.mock("@services/albums/createAlbum.service");
jest.mock("@services/albums/updateAlbum.service");
jest.mock("@services/albums/fetchAlbum.service");
jest.mock("@services/albums/fetchAlbums.service");
jest.mock("@services/albums/deleteAlbum.service");

afterEach(() => {
  jest.restoreAllMocks();
});

describe("/albums", () => {
  describe("POST /", () => {
    test("should throw an error when album creation fails", async () => {
      // Arrange
      const mockError = new Error();
      createAlbumService.mockRejectedValue(mockError);

      const req = {
        body: { albumName: "Test Album", createdBy: "userId123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await createAlbumHandler.handler(req, res);

      // Assert
      expect(createAlbumService).toHaveBeenCalledWith({
        albumName: "Test Album",
        createdBy: "userId123",
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.send).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error",
        data: null,
      });
    });
  });

  describe("PUT /:albumId", () => {
    test("should throw an error when album update fails", async () => {
      // Arrange
      const mockError = new Error();
      updateAlbumService.mockRejectedValue(mockError);

      const req = {
        params: { albumId: "albumId123" },
        body: { albumName: "Updated Album Name" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await updateAlbumHandler.handler(req, res);

      // Assert
      expect(updateAlbumService).toHaveBeenCalledWith({
        albumId: "albumId123",
        albumName: "Updated Album Name",
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.send).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error",
        data: null,
      });
    });
  });

  describe("GET /:albumId", () => {
    test("should throw an error when fetching a single album fails", async () => {
      // Arrange
      const mockError = new Error();
      fetchAlbumService.mockRejectedValue(mockError);

      const req = { params: { albumId: "albumId123" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await fetchAlbumHandler.handler(req, res);

      // Assert
      expect(fetchAlbumService).toHaveBeenCalledWith({
        albumId: "albumId123",
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.send).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error",
        data: null,
      });
    });
  });

  describe("GET /", () => {
    test("should throw an error when fetching albums fails", async () => {
      // Arrange
      const mockError = new Error();
      fetchAlbumsService.mockRejectedValue(mockError);

      const req = { query: { createdBy: "userId123", page: 1, limit: 10 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await fetchAlbumsHandler.handler(req, res);

      // Assert
      expect(fetchAlbumsService).toHaveBeenCalledWith({
        createdBy: "userId123",
        page: 1,
        limit: 10,
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.send).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error",
        data: null,
      });
    });
  });

  describe("DELETE /:albumId", () => {
    test("should throw an error when album deletion fails", async () => {
      // Arrange
      const mockError = new Error();
      deleteAlbumService.mockRejectedValue(mockError);

      const req = { params: { albumId: "albumId123" } };
      const res = {
        status: jest.fn().mockReturnThis(),
        send: jest.fn(),
      };

      // Act
      await deleteAlbumHandler.handler(req, res);

      // Assert
      expect(deleteAlbumService).toHaveBeenCalledWith({
        albumId: "albumId123",
      });
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS_CODES.BAD_REQUEST);
      expect(res.send).toHaveBeenCalledWith({
        status: "error",
        message: "Internal server error",
        data: null,
      });
    });
  });
});
