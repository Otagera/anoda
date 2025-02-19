export interface CanvasBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface BoundingBox {
	bottom: number;
	left: number;
	right: number;
	top: number;
}

export interface ImageSize {
	width: number;
	height: number;
}

export interface UploadImagesProps {
	sendToParent: {
		imageUrl: (data: string) => void;
		imageSize: (imageSize: ImageSize) => void;
		boundingBox: (boundingBox: BoundingBox[]) => void;
	};
}

export interface ImagesFromDB {
	faces: { face_id: number; bounding_box: BoundingBox }[];
	image_id: number;
	image_path: string;
	original_size: { width: number; height: number };
	upload_time: Date;
}
