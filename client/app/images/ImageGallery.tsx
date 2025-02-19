import { useState, useEffect } from "react";
import type { FC } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "~/utils/axios";
import type { ImagesFromDB } from "~/interface";
import ImageModal from "./ImageModal";
import ImageGridItem from "./ImageGridItem";
import { fetchImages } from "~/utils/api";

const ImagesList: FC = () => {
	const [images, setImages] = useState<ImagesFromDB[] | null>(null);
	const [selectedImage, setSelectedImage] = useState<ImagesFromDB | null>(null);

	const handleImageClick = (image: ImagesFromDB) => {
		setSelectedImage(image);
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
			console.log("__images.data", __images.data);
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
				<ImageModal image={selectedImage} />
			</div>
		</>
	);
};

export default ImagesList;
