import { useState, useEffect, useRef } from "react";

import type {
	BoundingBox,
	CanvasBox,
	DisplayImageProps,
	ImageSize,
} from "../interface";
import Tooltip from "~/components/tooltip";

const DisplayImage = ({
	imgSrcFP,
	imageSizeFP,
	facesFP,
	alt,
	...rest
}: DisplayImageProps) => {
	const [imgSrc, setImgSrc] = useState<string | undefined>("");
	const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>();
	const [canvasWidth, setCanvasWidth] = useState<number | undefined>();
	const [canvasHeight, setCanvasHeight] = useState<number | undefined>();
	const [imageSize, setImageSize] = useState<ImageSize | undefined>();
	const [boundingBoxes, setBoundingBoxes] = useState<
		BoundingBox[] | undefined
	>();
	const [canvasBox, setCanvasBox] = useState<CanvasBox[] | undefined>();
	const [faceImgSrc, setFaceImgSrc] = useState<string[]>([]);
	const [smallCtx, setSmallCtx] = useState<CanvasRenderingContext2D | null>();

	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const smallCanvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		setCtx(canvas?.getContext("2d"));
	}, [canvasRef.current]);

	useEffect(() => {
		const canvas = smallCanvasRef.current;
		setSmallCtx(canvas?.getContext("2d"));
	}, [smallCanvasRef.current]);

	//
	useEffect(() => {
		if (imgSrcFP) {
			setImgSrc(imgSrcFP);
			setFaceImgSrc([]);
		}
	}, [imgSrcFP]);
	useEffect(() => {
		if (imageSizeFP) {
			setImageSize(imageSizeFP);
		}
	}, [imageSizeFP]);
	useEffect(() => {
		if (facesFP && facesFP.length) {
			setBoundingBoxes(
				facesFP.map((face) => {
					return face.bounding_box;
				})
			);
		}
	}, [facesFP]);

	useEffect(() => {
		if (ctx && smallCtx && canvasBox)
			drawBoundingBoxes(ctx, smallCtx, canvasBox);
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
	}, [canvasWidth, canvasHeight, imageSize, boundingBoxes]);

	const drawBoundingBoxes = (
		context: CanvasRenderingContext2D,
		smallCtx: CanvasRenderingContext2D,
		boxes: CanvasBox[]
	) => {
		if (canvasWidth && canvasHeight)
			context.clearRect(0, 0, canvasWidth, canvasHeight); // Clear canvas on each draw

		context.strokeStyle = "red"; // Style for bounding boxes (you can customize)
		context.lineWidth = 3;

		const locaImgs: string[] = [];

		boxes.forEach((box) => {
			// For rectangle
			// context.strokeRect(box.x, box.y, box.width, box.height);

			// Cicle
			const centerX = box.x + box.width / 2;
			const centerY = box.y + box.height / 2;
			const radius =
				Math.sqrt(Math.pow(box.width, 2) + Math.pow(box.height, 2)) / 2;
			const startAngle = 0; // Starting angle (in radians)
			const endAngle = 2 * Math.PI; // Ending angle (2*PI for a full circle)

			// Create linear gradient
			const gradient = context.createLinearGradient(
				centerX - radius, // x0: Start X coordinate
				centerY - radius, // y0: Start Y coordinate
				centerX + radius, // x1: End X coordinate
				centerY + radius // y1: End Y coordinate
			);

			// Add color stops
			gradient.addColorStop(0, "purple"); // Start color
			gradient.addColorStop(0.5, "blue"); // Middle color
			gradient.addColorStop(1, "cyan"); // End color

			// Set stroke style to the gradient
			context.strokeStyle = gradient;
			context.lineWidth = 1;

			context.beginPath();
			context.arc(centerX, centerY, radius, startAngle, endAngle);
			context.stroke();

			console.log("imgSrc", imgSrc);
			console.log("smallCtx", smallCtx);

			if (imgSrc && smallCtx) {
				const image = new Image();
				image.crossOrigin = "anonymous"; // Add this line
				image.src = imgSrc;

				image.onload = () => {
					const canvas = smallCanvasRef.current;
					if (canvas) {
						const cutWidth = 665;
						const cutHeight = 665;
						const cutX = 872;
						const cutY = 1390;
						canvas.width = cutWidth;
						canvas.height = cutHeight;

						smallCtx?.drawImage(
							image,
							cutX,
							cutY,
							cutWidth,
							cutHeight,
							0,
							0,
							cutWidth,
							cutHeight
						);
						locaImgs.push(canvas.toDataURL());
						console.log("[inside onload] locaImgs", locaImgs);
						smallCtx?.clearRect(0, 0, canvas.width, canvas.height);
					}
				};
			}
			console.log("[inside map] locaImgs", locaImgs);
		});
		console.log("locaImgs", locaImgs);
		setFaceImgSrc(locaImgs);
	};
	const handleImageLoad = () => {
		setCanvasWidth(imgRef.current?.width);
		setCanvasHeight(imgRef.current?.height);
	};

	return (
		<>
			<div className="image-container">
				{imgSrc ? (
					<img
						aria-describedby="tooltip-id"
						id="uploadedImage"
						src={imgSrc}
						alt={alt}
						onLoad={handleImageLoad}
						ref={imgRef}
						{...rest}
					/>
				) : (
					<></>
				)}
				<canvas
					id="boundingBoxCanvas"
					ref={canvasRef}
					width={canvasWidth}
					height={canvasHeight}
				></canvas>
				{faceImgSrc.length ? (
					faceImgSrc?.map((src, index) => {
						return (
							<img
								// aria-describedby="tooltip-id"
								// id="uploadedImage"
								src={src}
								alt={alt}
								key={index}
								// onLoad={handleImageLoad}
								// ref={imgRef}
							/>
						);
					})
				) : (
					<></>
				)}
				<canvas ref={smallCanvasRef} style={{ display: "none" }} />
			</div>
		</>
	);
};

export default DisplayImage;
