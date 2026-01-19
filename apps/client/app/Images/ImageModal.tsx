import { useRef, useEffect, useState } from "react";

interface ImageModalProps {
	image: any; // TODO: Define a proper interface for the image object
	onClose: () => void;
}

const ImageModal = ({ image, onClose }: ImageModalProps) => {
	const imgRef = useRef<HTMLImageElement>(null);
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
			imgRef.current.onload = updateDimensions;
			window.addEventListener("resize", updateDimensions);
		}

		return () => {
			window.removeEventListener("resize", updateDimensions);
		};
	}, [image]);

	return (
		<div
			className="fixed top-0 left-0 w-full h-full bg-black/80 flex justify-center items-center"
			onClick={onClose}
		>
			<div
				className="bg-white p-5 rounded-lg relative max-w-[80%] max-h-[80%] overflow-auto"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="relative inline-block">
					<img
						ref={imgRef}
						src={image.imagePath}
						alt="Selected"
						className="max-w-full max-h-[70vh] block mx-auto mb-4"
					/>
					{image.faces &&
						image.faces.map((face: any, index: number) => {
							const { x, y, width, height } = face.boundingBox;
							const scaleX = imageDimensions.width / image.originalSize.width;
							const scaleY = imageDimensions.height / image.originalSize.height;

							return (
								<div
									key={index}
									className="absolute border-4 border-red-500"
									style={{
										left: `${x * scaleX}px`,
										top: `${y * scaleY}px`,
										width: `${width * scaleX}px`,
										height: `${height * scaleY}px`,
									}}
								/>
							);
						})}
				</div>
				<div className="flex justify-center">
					<button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
						Search for Faces
					</button>
				</div>
				<button
					className="absolute top-2.5 right-2.5 text-black"
					onClick={onClose}
				>
					X
				</button>
			</div>
		</div>
	);
};

export default ImageModal;
