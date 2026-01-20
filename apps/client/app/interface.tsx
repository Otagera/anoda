import type { HTMLAttributes } from "react";

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

export interface Face {
	face_id: number;
	bounding_box: BoundingBox;
	person_id?: string | null;
}

export interface Person {
	personId: string;
	name: string;
	createdAt: string;
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

export interface DisplayImageProps extends HTMLAttributes<HTMLImageElement> {
	imgSrcFP: string;
	imageSizeFP: ImageSize;
	facesFP?: Face[];
	alt: string;
}

export interface ImageFromDB {
	faces: Face[];
	imageId: string;
	imagePath: string;
	originalSize: { width: number; height: number };
	uploadDate: string;
}
