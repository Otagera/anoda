import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TagPersonModal from "../components/TagPersonModal";

import type {
	BoundingBox,
	CanvasBox,
	DisplayImageProps,
	ImageSize,
} from "../interface";

const DisplayImage = ({
	imgSrcFP,
	imageSizeFP,
	facesFP,
	alt,
	...rest
}: DisplayImageProps) => {
	const navigate = useNavigate();
	const [imgSrc, setImgSrc] = useState<string | undefined>("");
	const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>();
	const [canvasWidth, setCanvasWidth] = useState<number | undefined>();
	const [canvasHeight, setCanvasHeight] = useState<number | undefined>();
	const [imageSize, setImageSize] = useState<ImageSize | undefined>();
	const [boundingBoxes, setBoundingBoxes] = useState<
		BoundingBox[] | undefined
	>();
	const [canvasBox, setCanvasBox] = useState<CanvasBox[] | undefined>();
	const [faceCrops, setFaceCrops] = useState<
		{ id: number; src: string; personId?: string | null }[]
	>([]);
	const [taggingFaceId, setTaggingFaceId] = useState<number | null>(null);

	const imgRef = useRef<HTMLImageElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		setCtx(canvas?.getContext("2d"));
	}, [canvasRef.current]);

	//
	useEffect(() => {
		if (imgSrcFP) {
			setImgSrc(imgSrcFP);
			setFaceCrops([]);
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
				}),
			);
		}
	}, [facesFP]);

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

	useEffect(() => {
		if (ctx && canvasBox) drawOverlay(ctx, canvasBox);
	}, [ctx, canvasBox]);

	useEffect(() => {
		if (imgSrc && facesFP && facesFP.length) {
			generateFaceCrops();
		} else {
			setFaceCrops([]);
		}
	}, [imgSrc, facesFP]);

	const generateFaceCrops = async () => {
		if (!imgSrc || !facesFP || !facesFP.length) return;

		const image = new Image();
		image.crossOrigin = "anonymous";
		image.src = imgSrc;

		await new Promise((resolve) => {
			image.onload = resolve;
		});

		const crops: { id: number; src: string; personId?: string | null }[] = [];
		const canvas = document.createElement("canvas");
		const cropCtx = canvas.getContext("2d");

		if (!cropCtx) return;

		for (const face of facesFP) {
			const box = face.bounding_box;
			const width = box.right - box.left;
			const height = box.bottom - box.top;

			canvas.width = width;
			canvas.height = height;

			cropCtx.clearRect(0, 0, width, height);
			cropCtx.drawImage(
				image,
				box.left,
				box.top,
				width,
				height,
				0,
				0,
				width,
				height,
			);
			crops.push({
				id: face.face_id,
				src: canvas.toDataURL(),
				personId: face.person_id,
			});
		}

		setFaceCrops(crops);
	};

	const drawOverlay = (
		context: CanvasRenderingContext2D,
		boxes: CanvasBox[],
	) => {
		if (!canvasWidth || !canvasHeight) return;
		context.clearRect(0, 0, canvasWidth, canvasHeight);

		boxes.forEach((box) => {
			const centerX = box.x + box.width / 2;
			const centerY = box.y + box.height / 2;
			const radius = Math.sqrt(box.width ** 2 + box.height ** 2) / 2;

			const gradient = context.createLinearGradient(
				centerX - radius,
				centerY - radius,
				centerX + radius,
				centerY + radius,
			);

			gradient.addColorStop(0, "purple");
			gradient.addColorStop(0.5, "blue");
			gradient.addColorStop(1, "cyan");

			context.strokeStyle = gradient;
			context.lineWidth = 2;

			context.beginPath();
			context.arc(centerX, centerY, radius, 0, 2 * Math.PI);
			context.stroke();
		});
	};

	const handleFaceClick = (faceId: number) => {
		navigate(`/search?faceId=${faceId}`);
	};

	const handleImageLoad = () => {
		setCanvasWidth(imgRef.current?.width);
		setCanvasHeight(imgRef.current?.height);
	};

	return (
		<div className="flex flex-col items-center w-full">
			<div className="image-container relative mb-8">
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
			</div>

			{faceCrops.length > 0 && (
				<div className="w-full">
					<h3 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
						Detected Faces
					</h3>
					<div className="flex flex-wrap gap-6 justify-center">
						{faceCrops.map((crop, index) => (
							<div
								key={`${crop.id}-${index}`}
								className="flex flex-col items-center space-y-3"
							>
								<button
									onClick={() => handleFaceClick(crop.id)}
									className="group flex flex-col items-center space-y-2 transition-transform hover:scale-110 focus:outline-none"
									title="Click to search for this face"
								>
									<div className="relative">
										<img
											src={crop.src}
											alt={`Face ${index + 1}`}
											className="w-20 h-20 rounded-full border-4 border-white dark:border-gray-800 object-cover shadow-md group-hover:border-blue-500 transition-colors"
										/>
										<div className="absolute inset-0 rounded-full bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
												/>
											</svg>
										</div>
									</div>
								</button>
								<div className="flex flex-col items-center">
									<button
										onClick={() => setTaggingFaceId(crop.id)}
										className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
									>
										{crop.personId ? "Change Tag" : "Tag Person"}
									</button>
									<span className="text-[10px] mt-1 text-gray-400">
										ID: {crop.id}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{taggingFaceId && (
				<TagPersonModal
					faceId={taggingFaceId}
					currentPersonId={
						faceCrops.find((f) => f.id === taggingFaceId)?.personId
					}
					onClose={() => setTaggingFaceId(null)}
				/>
			)}
		</div>
	);
};

export default DisplayImage;
