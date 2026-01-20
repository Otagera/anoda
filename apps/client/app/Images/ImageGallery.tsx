import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { ImageFromDB } from "~/interface";
import { deleteImage, fetchImages } from "~/utils/api";
import ImageGridItem from "./ImageGridItem";
import ImageModal from "./ImageModal";

const ImagesList: FC = () => {
	const [images, setImages] = useState<ImageFromDB[] | null>(null);
	const [selectedImage, setSelectedImage] = useState<ImageFromDB | null>(null);

	const handleImageClick = (image: ImageFromDB) => {
		setSelectedImage(image);
	};

	const unSelectImage = () => {
		setSelectedImage(null);
	};

	const queryClient = useQueryClient();

	const {
		data: __images,
		isLoading,
		isError,
	} = useQuery({ queryKey: ["images"], queryFn: fetchImages });

	useEffect(() => {
		if (__images) {
			setImages(__images?.data?.images);
		}
	}, [__images]);

	const handleDeleteImage = async (imageId: string) => {
		try {
			await deleteImage(imageId);
			queryClient.invalidateQueries({ queryKey: ["images"] });
			console.log(`Image with ID ${imageId} deleted successfully.`);
		} catch (error) {
			console.error(`Error deleting image with ID ${imageId}:`, error);
		}
	};

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
									id: image.imageId,
									width: image.originalSize.width,
									height: image.originalSize.height,
									url: image.imagePath,
									alt: image.imagePath,
								}}
								className="cursor-pointer"
								onClick={() => handleImageClick(image)}
								onDelete={handleDeleteImage}
							/>
						</div>
					);
				})}
				<ImageModal image={selectedImage} onClose={unSelectImage} />
			</div>
		</>
	);
};

export default ImagesList;
