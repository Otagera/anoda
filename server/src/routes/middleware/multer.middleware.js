// import cloudinary from 'cloudinary';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
const multer = require("multer");
const fs = require("fs");
const path = require("path");

/* const cloudinaryV2 = cloudinary.v2;
cloudinaryV2.config({
	cloud_name: '',
	api_key: '',
	api_secret: ''
}); */

// Define the uploads directory
const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    const relativeFilePath = `uploads/${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    cb(null, path.basename(relativeFilePath));
    // cb(null, new Date().toISOString().replace(/:/g, "-") + file.originalname);
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
