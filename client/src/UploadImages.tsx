import { useState, useEffect, useRef } from "react";

import "./App.css";
import StoreImage from "./StoreImage";
import SearchImage from "./SearchImage";
import { BoundingBox, CanvasBox, ImageSize } from "./interface";

const UploadImages = () => {
	const [imgSrc, setImgSrc] = useState<string | undefined>("");
	const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>();
	const [canvasWidth, setCanvasWidth] = useState<number | undefined>();
	const [canvasHeight, setCanvasHeight] = useState<number | undefined>();
	const [imageSize, setImageSize] = useState<ImageSize | undefined>();
	const [boundingBoxes, setBoundingBoxes] = useState<
		BoundingBox[] | undefined
	>();
	const [canvasBox, setCanvasBox] = useState<CanvasBox[] | undefined>();
	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const handleImageUrlFromChild = (data: string) => {
		setImgSrc(data);
	};
	const handleImageSizeFromChild = (imageSize: ImageSize) => {
		setImageSize(imageSize);
	};
	const handleBoundingBoxFromChild = (boundingBoxes: BoundingBox[]) => {
		setBoundingBoxes(boundingBoxes);
	};

	useEffect(() => {
		setCtx(canvasRef.current?.getContext("2d"));
		console.log("ctx", ctx);
	}, [canvasRef.current]);
	useEffect(() => {
		return () => {
			if (imgSrc) {
				URL.revokeObjectURL(imgSrc);
			}
		};
	}, [imgSrc]);
	useEffect(() => {
		if (ctx && canvasBox) drawBoundingBoxes(ctx, canvasBox);
	}, [canvasBox]);
	useEffect(() => {
		const scaleX =
			canvasWidth && imageSize?.width ? canvasWidth / imageSize.width : 1;
		const scaleY =
			canvasHeight && imageSize?.height ? canvasHeight / imageSize.height : 1;

		if (boundingBoxes?.length) {
			const tempCanvasBoxes = boundingBoxes.map((boundingBox) => {
				return {
					x: boundingBox.left * scaleX,
					y: boundingBox.top * scaleY,
					width: (boundingBox.right - boundingBox.left) * scaleX,
					height: (boundingBox.bottom - boundingBox.top) * scaleY,
				};
			});
			setCanvasBox(tempCanvasBoxes);
		}
	}, [imageSize, boundingBoxes]);

	const drawBoundingBoxes = (
		context: CanvasRenderingContext2D,
		boxes: CanvasBox[]
	) => {
		if (canvasWidth && canvasHeight)
			context.clearRect(0, 0, canvasWidth, canvasHeight); // Clear canvas on each draw

		context.strokeStyle = "red"; // Style for bounding boxes (you can customize)
		context.lineWidth = 3;

		boxes.forEach((box) => {
			context.strokeRect(box.x, box.y, box.width, box.height);
		});
	};
	const handleImageLoad = () => {
		setCanvasWidth(imgRef.current?.width);
		setCanvasHeight(imgRef.current?.height);
	};

	return (
		<>
			<StoreImage
				sendToParent={{
					imageUrl: handleImageUrlFromChild,
					imageSize: handleImageSizeFromChild,
					boundingBox: handleBoundingBoxFromChild,
				}}
			/>
			<SearchImage />
			<div className="image-container">
				<img
					id="uploadedImage"
					src={imgSrc}
					alt="Uploaded Image"
					onLoad={handleImageLoad}
					ref={imgRef}
				/>
				<canvas
					id="boundingBoxCanvas"
					ref={canvasRef}
					width={canvasWidth}
					height={canvasHeight}
				></canvas>
			</div>
		</>
	);
};

export default UploadImages;
