// import cloudinary from 'cloudinary';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// const cloudinaryV2 = cloudinary.v2;
// cloudinaryV2.config({
// 	cloud_name: '',
// 	api_key: '',
// 	api_secret: ''
// });

let storage = null;
/*
	if(process.env.NODE_ENV === 'production'){
		storage = new CloudinaryStorage({
			cloudinary: cloudinaryV2,
			params: async (req, file)=>{
				return {
					folder: 'chatapp/uploads',
					resource_type: 'auto',
					public_id: new Date().toISOString().replace(/:/g, '-') + file.originalname
				};
			}
		});
	}else {
*/
storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "..", "..", "uploads");
    if (!fs.existsSync(dir)) {
      fs.mkdir(dir, (err) => {
        console.log("[mkdir] err", err);
        cb(null, dir);
      });
    } else {
      cb(null, dir);
    }
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
  },
});
//}

const filefilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/svg+xml"
  ) {
    //cb(null, true);
  } else {
    //cb(null, false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5, //5MB
  },
  fileFilter: filefilter,
});

module.exports = upload;
