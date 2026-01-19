import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface ImageModalProps {
	image: any; // TODO: Define a proper interface for the image object
	albumId?: string;
	onClose: () => void;
}

const ImageModal = ({ image, albumId, onClose }: ImageModalProps) => {
	const imgRef = useRef<HTMLImageElement>(null);
	const navigate = useNavigate();
	const [imageDimensions, setImageDimensions] = useState({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const updateDimensions = () => {
			if (imgRef.current) {
				setImageDimensions({
					width: imgRef.current.offsetWidth,
					height: imgRef.current.offsetHeight,
				});
			}
		};

		if (imgRef.current) {
			if (imgRef.current.complete) {
				updateDimensions();
			} else {
				imgRef.current.onload = updateDimensions;
			}
			window.addEventListener("resize", updateDimensions);
		}

		return () => {
			window.removeEventListener("resize", updateDimensions);
		};
	}, [image]);

	if (!image) return null;

	const handleFaceClick = (faceId: number) => {
		let searchUrl = `/search?faceId=${faceId}`;
		if (albumId) {
			searchUrl += `&albumId=${albumId}`;
		}
		navigate(searchUrl);
	};

	return (
		<div
			className="fixed top-0 left-0 w-full h-full bg-black/80 flex justify-center items-center z-50 p-4"
			onClick={onClose}
		>
			<div
				className="bg-white dark:bg-gray-800 p-6 rounded-xl relative max-w-full max-h-full overflow-auto shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="relative inline-block">
					<img
						ref={imgRef}
						src={image.imagePath}
						alt="Selected"
						className="max-w-full max-h-[85vh] rounded shadow-sm"
					/>
					{image.faces &&
						image.faces.map((face: any, index: number) => {
							const { top, left, right, bottom } = face.bounding_box;
							const scaleX = imageDimensions.width / image.originalSize.width;
							const scaleY = imageDimensions.height / image.originalSize.height;

							const width = (right - left) * scaleX;
							const height = (bottom - top) * scaleY;
							const x = left * scaleX;
							const y = top * scaleY;

							return (
								<div
									key={index}
									className="absolute border-2 border-red-500 hover:border-blue-500 cursor-pointer transition-colors duration-200"
									style={{
										left: `${x}px`,
										top: `${y}px`,
										width: `${width}px`,
										height: `${height}px`,
									}}
									title="Click to search for this face"
									onClick={() => handleFaceClick(face.face_id)}
								/>
							);
						})}
				</div>
				<button
					className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-gray-700/80 rounded-full text-gray-800 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-gray-700 transition-all shadow-md z-10"
					onClick={onClose}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default ImageModal;
