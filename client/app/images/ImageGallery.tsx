import { useState, useEffect } from "react";
import type { FC } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImageFromDB } from "~/interface";
import ImageModal from "./ImageModal";
import ImageGridItem from "./ImageGridItem";
import { fetchImages } from "~/utils/api";

const ImagesList: FC = () => {
	const [images, setImages] = useState<ImageFromDB[] | null>(null);
	const [selectedImage, setSelectedImage] = useState<ImageFromDB | null>(null);

	const handleImageClick = (image: ImageFromDB) => {
		setSelectedImage(image);
	};

	const unSelectImage = () => {
		setSelectedImage(null);
	};

	// Access the client
	const queryClient = useQueryClient();

	const {
		data: __images,
		isLoading,
		isError,
	} = useQuery({ queryKey: ["images"], queryFn: fetchImages });

	useEffect(() => {
		if (__images) {
			setImages(__images?.data);
		}
	}, [__images]);

	if (isLoading) return <div>Loading...</div>;
	if (isError) return <div>Error loading images.</div>;

	return (
		<>
			<div className="gridContainer">
				{images?.map((image, index) => {
					return (
						<div key={index} className="imgList-grid-item">
							<ImageGridItem
								image={{
									width: image.original_size.width,
									height: image.original_size.height,
									url: image.image_path,
									alt: image.image_path,
								}}
								className="cursor-pointer"
								onClick={() => handleImageClick(image)}
							/>
						</div>
					);
				})}
				<ImageModal image={selectedImage} unSelectImage={unSelectImage} />
			</div>
		</>
	);
};

export default ImagesList;
