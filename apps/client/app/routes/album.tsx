import { Link, useParams } from "react-router-dom";
import ImageModal from "~/Images/ImageModal";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlbum, fetchImagesInAlbum, uploadImages } from "../utils/api";

const AlbumPage = () => {
	const { albumId } = useParams();
	const queryClient = useQueryClient();
	const [selectedImage, setSelectedImage] = useState<any>(null);
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [files, setFiles] = useState<FileList | null>(null);

	const { data: imagesData, isLoading: isImagesDataLoading } = useQuery({
		queryKey: ["images", albumId],
		queryFn: () => fetchImagesInAlbum(albumId!),
		enabled: !!albumId,
	});

	const { data: albumData, isLoading: isAlbumDataLoading } = useQuery({
		queryKey: [`album-${albumId}`, albumId],
		queryFn: () => fetchAlbum(albumId!),
		enabled: !!albumId,
	});

	const uploadImagesMutation = useMutation({
		mutationFn: uploadImages,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["images", albumId] });
			setIsUploadModalOpen(false);
			setFiles(null);
		},
	});

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			setFiles(e.target.files);
		}
	};

	const handleUpload = () => {
		if (files) {
			const formData = new FormData();
			for (let i = 0; i < files.length; i++) {
				formData.append("uploadedImages", files[i]);
			}
			formData.append("albumId", albumId!);
			uploadImagesMutation.mutate(formData);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<Link to="/home" className="text-blue-600 hover:underline mb-8 block">
				&larr; Back to Albums
			</Link>
			<div className="flex justify-between items-center mb-8">
				<div className="flex flex-col justify-between items-center mb-8">
					<h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
						Album {albumData?.data?.albumName}
					</h1>
					<h6 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
						{albumId}
					</h6>
				</div>
				<button
					className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
					onClick={() => setIsUploadModalOpen(true)}
				>
					Upload Images
				</button>
			</div>
			{isImagesDataLoading && isAlbumDataLoading ? (
				<div>Loading...</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
					{imagesData?.data?.imagesInAlbum?.map((imageInAlbum: any) => (
						<div
							key={imageInAlbum.imageId}
							className="block group"
							onClick={() => setSelectedImage(imageInAlbum)}
						>
							<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
								<img
									src={imageInAlbum.imagePath}
									alt={imageInAlbum.imageId}
									className="w-full h-48 object-cover"
								/>
							</div>
						</div>
					))}
				</div>
			)}
			{selectedImage && (
				<ImageModal
					image={selectedImage}
					onClose={() => setSelectedImage(null)}
				/>
			)}
			{isUploadModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white p-8 rounded-lg">
						<h2 className="text-2xl font-bold mb-4">Upload Images</h2>
						<input type="file" multiple onChange={handleFileChange} />
						<div className="flex justify-end mt-4">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
								onClick={handleUpload}
								disabled={uploadImagesMutation.isPending || !files}
							>
								{uploadImagesMutation.isPending ? "Uploading..." : "Upload"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
								onClick={() => setIsUploadModalOpen(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default AlbumPage;
