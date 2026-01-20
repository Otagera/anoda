import type { HTMLAttributes } from "react";

const getSpanEstimate = (size: number) => {
	if (size > 250) {
		return 2;
	}
	return 1;
};

interface ImageGridItemProps extends HTMLAttributes<HTMLImageElement> {
	image: {
		width: number;
		height: number;
		url: string;
		alt: string;
		id: string;
	};
	onDelete: (imageId: string) => void;
}

const ImageGridItem = ({
	image,
	className,
	onClick,
	onDelete,
}: ImageGridItemProps) => {
	const style = {
		gridColumnEnd: `span ${getSpanEstimate(image.width)}`,
		gridRowEnd: `span ${getSpanEstimate(image.height)}`,
	};

	return (
		<div className="image-grid-item-container">
			<img
				style={style}
				src={image.url}
				alt={image.alt}
				className={className}
				onClick={onClick}
			/>
			<button
				className="delete-button"
				onClick={(e) => {
					e.stopPropagation(); // Prevent image click from firing
					onDelete(image.id);
				}}
			>
				X
			</button>
		</div>
	);
};

export default ImageGridItem;
