import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import type { ImagesFromDB } from "~/interface";
import { deleteImage } from "~/utils/api";
import DisplayImage from "./DisplayImage";

const ImageModal = ({ image }: { image: ImagesFromDB | null }) => {
	const [selectedImage, setSelectedImage] = useState<ImagesFromDB | null>(null);
	const queryClient = useQueryClient();

	const {
		isPending,
		isError,
		isSuccess,
		mutate: deleteMutate,
	} = useMutation({
		mutationFn: deleteImage,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["images"] }); // Invalidate cache after delete
		},
	});

	const handleCloseModal = () => {
		setSelectedImage(null);
	};

	const handleDeleteImage = () => {
		console.log("Deleting image:", selectedImage?.image_path);
		if (selectedImage && selectedImage.image_id)
			deleteMutate(selectedImage?.image_id);
		setSelectedImage(null);
	};
	useEffect(() => {
		if (image) setSelectedImage(image);
	}, [image]);

	return (
		<>
			{selectedImage && (
				<div
					className="fixed top-0 left-0 w-full h-full bg-black/80 flex justify-center items-center"
					onClick={handleCloseModal}
				>
					{isPending ? (
						<div>Deleting image: {selectedImage?.image_path}</div>
					) : isError ? (
						<div>Error deletng image.</div>
					) : isSuccess ? (
						<div>Image deleted succesfully</div>
					) : (
						<div
							className="bg-white p-5 rounded-lg relative max-w-[80%] max-h-[80%] overflow-auto"
							onClick={(e) => e.stopPropagation()} // Prevent closing on inner clicks
						>
							<DisplayImage
								imgSrcFP={selectedImage.image_path}
								imageSizeFP={selectedImage.original_size}
								facesFP={selectedImage.faces}
								alt={selectedImage.image_path}
								className="max-w-full max-h-[60vh] block mx-auto mb-2.5"
							/>
							<h2>Name: {selectedImage.image_path}</h2>
							<p>Description: {selectedImage.image_path}</p>
							<button onClick={handleDeleteImage}>Delete Image</button>
							<button
								className="absolute top-2.5 right-2.5"
								onClick={handleCloseModal}
							>
								X
							</button>
						</div>
					)}
				</div>
			)}
		</>
	);
};

export default ImageModal;
