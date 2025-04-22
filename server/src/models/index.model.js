const models = ["album_images", "albums", "faces", "images", "users"];
const Albums = require("./albums.model");
const Images = require("./images.model");
const Users = require("./users.model");
const Faces = require("./faces.model");
const AlbumImages = require("./albumImages.model");

module.exports = { models, Albums, Images, Users, Faces, AlbumImages };
