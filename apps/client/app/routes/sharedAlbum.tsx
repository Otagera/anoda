import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import ImageModal from "~/Images/ImageModal";
import { fetchSharedAlbum } from "../utils/api";

const SharedAlbumPage = () => {
	const { token } = useParams<{ token: string }>();
	const [selectedImage, setSelectedImage] = useState<any>(null);

	const { data: albumResponse, isLoading } = useQuery({
		queryKey: ["shared-album", token],
		queryFn: () => fetchSharedAlbum(token!),
		enabled: !!token,
	});

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-screen">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (!albumResponse?.data) {
		return (
			<div className="flex flex-col items-center justify-center h-screen px-4">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
					Album Not Found
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
					This shared link may have expired or is invalid.
				</p>
				<Link
					to="/"
					className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					Go to Home
				</Link>
			</div>
		);
	}

	const albumData = albumResponse.data;

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex flex-col mb-8">
				<h1 className="text-3xl font-bold text-black dark:text-white">
					{albumData.albumName}
				</h1>
				<p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
					Viewing shared album
				</p>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
				{albumData.images?.map((image: any) => (
					<div
						key={image.imageId}
						className="block group cursor-pointer"
						onClick={() => setSelectedImage(image)}
					>
						<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
							<img
								src={image.imagePath}
								alt={image.imageId}
								className="w-full h-48 object-cover"
							/>
						</div>
					</div>
				))}
			</div>

			{selectedImage && (
				<ImageModal
					image={selectedImage}
					shareToken={token}
					onClose={() => setSelectedImage(null)}
				/>
			)}
		</div>
	);
};

export default SharedAlbumPage;
