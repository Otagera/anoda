import type { HTMLAttributes } from "react";

const getSpanEstimate = (size: number) => {
	if (size > 250) {
		return 2;
	}
	return 1;
};

const ImageGridItem = ({
	image,
	className,
	onClick,
}: {
	image: { width: number; height: number; url: string; alt: string };
} & HTMLAttributes<HTMLImageElement>) => {
	const style = {
		gridColumnEnd: `span ${getSpanEstimate(image.width)}`,
		gridRowEnd: `span ${getSpanEstimate(image.height)}`,
	};

	return (
		<img
			style={style}
			src={image.url}
			alt={image.alt}
			className={className}
			onClick={onClick}
		/>
	);
};

export default ImageGridItem;
