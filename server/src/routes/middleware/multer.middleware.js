// import cloudinary from 'cloudinary';
// import { CloudinaryStorage } from 'multer-storage-cloudinary';
const multer = require("multer");
const fs = require("fs");

// const cloudinaryV2 = cloudinary.v2;
// cloudinaryV2.config({
// 	cloud_name: 'lenxo',
// 	api_key: '432723375944148',
// 	api_secret: 'JSDqr-nva3H92LFl-AktW0y5MZ4'
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
		if (!fs.existsSync("./uploads/")) {
			fs.mkdir("./uploads/", (err) => {
				console.log(err);
				cb(null, "./uploads/");
			});
		} else {
			cb(null, "./uploads/");
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
