import { Link, useParams } from "react-router-dom";
import ImageModal from "~/Images/ImageModal";
import { ShareModal } from "../components/ShareModal";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlbum, fetchImagesInAlbum, uploadImages } from "../utils/api";
import { useUpload } from "../utils/UploadContext";

const AlbumPage = () => {
	const { albumId } = useParams();
	const queryClient = useQueryClient();
	const { addUploads } = useUpload();
	const [selectedImage, setSelectedImage] = useState<any>(null);
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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
			addUploads(files, albumId!);
			setIsUploadModalOpen(false);
			setFiles(null);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<Link
				to="/home"
				className="text-blue-600 dark:text-blue-400 hover:underline mb-8 block font-medium transition-colors"
			>
				&larr; Back to Albums
			</Link>
			<div className="flex justify-between items-start mb-8">
				<div>
					<h1 className="text-3xl font-bold text-black dark:text-white">
						{albumData?.data?.albumName}
					</h1>
					<p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
						ID: {albumId}
					</p>
				</div>
				<div className="flex space-x-3">
					<button
						className="px-4 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-2 cursor-pointer"
						onClick={() => setIsShareModalOpen(true)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
						</svg>
						<span>Share</span>
					</button>
					<button
						className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
						onClick={() => setIsUploadModalOpen(true)}
					>
						Upload Images
					</button>
				</div>
			</div>
			{isImagesDataLoading && isAlbumDataLoading ? (
				<div>Loading...</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
					{imagesData?.data?.imagesInAlbum?.map((imageInAlbum: any) => (
						<div
							key={imageInAlbum.imageId}
							className="block group cursor-pointer"
							onClick={() => setSelectedImage(imageInAlbum.images)}
						>
							<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
								<img
									src={imageInAlbum.images.imagePath}
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
					albumId={albumId}
					onClose={() => setSelectedImage(null)}
				/>
			)}
			{isShareModalOpen && (
				<ShareModal
					albumId={albumId!}
					albumName={albumData?.data?.albumName || ""}
					shareToken={albumData?.data?.shareToken}
					onClose={() => setIsShareModalOpen(false)}
				/>
			)}
			{isUploadModalOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
						<h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
							Upload Images
						</h2>
						<input
							type="file"
							multiple
							onChange={handleFileChange}
							className="mb-6 w-full text-sm text-gray-500 dark:text-gray-400
								file:mr-4 file:py-2 file:px-4
								file:rounded-full file:border-0
								file:text-sm file:font-semibold
								file:bg-blue-50 file:text-blue-700
								hover:file:bg-blue-100
								dark:file:bg-gray-700 dark:file:text-blue-400"
						/>

						{uploadImagesMutation.isError && (
							<div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 rounded text-sm">
								{(uploadImagesMutation.error as any).response?.data?.message ||
									uploadImagesMutation.error.message ||
									"Failed to upload images"}
							</div>
						)}

						<div className="flex justify-end mt-4">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors mr-2 disabled:opacity-50"
								onClick={handleUpload}
								disabled={uploadImagesMutation.isPending || !files}
							>
								{uploadImagesMutation.isPending ? "Uploading..." : "Upload"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
