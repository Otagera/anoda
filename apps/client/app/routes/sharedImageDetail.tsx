import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import DisplayImage from "../Images/DisplayImage";
import { fetchSharedImage } from "../utils/api";

const SharedImageDetail = () => {
	const { token, imageId } = useParams<{ token: string; imageId: string }>();

	const {
		data: imageResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["shared-image", token, imageId],
		queryFn: () => fetchSharedImage(token!, imageId!),
		enabled: !!token && !!imageId,
	});

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
			</div>
		);
	}

	if (error || !imageResponse?.data) {
		return (
			<div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-4">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
					Image Not Found
				</h1>
				<p className="text-gray-600 dark:text-gray-400 mb-8 text-center">
					The image you are looking for does not exist or has been deleted.
				</p>
				<Link
					to={`/share/${token}`}
					className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					Back to Album
				</Link>
			</div>
		);
	}

	const image = imageResponse.data;

	return (
		<div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
			<div className="flex justify-between items-center mb-8">
				<Link
					to={`/share/${token}`}
					className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
				>
					&larr; Back to Album
				</Link>
			</div>

			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700 p-6">
				<h1 className="text-2xl font-bold text-black dark:text-white mb-6">
					Image Details
				</h1>

				<div className="flex flex-col items-center">
					<DisplayImage
						imgSrcFP={image.imagePath}
						imageSizeFP={image.originalSize}
						facesFP={image.faces}
						alt="Image details"
						className="max-w-full rounded shadow-sm"
					/>
				</div>

				<div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
							Properties
						</h3>
						<div className="flex justify-between">
							<span className="text-gray-600 dark:text-gray-400">Size:</span>
							<span className="text-gray-900 dark:text-white">
								{image.originalSize?.width} x {image.originalSize?.height} px
							</span>
						</div>
					</div>

					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">
							Faces Detected
						</h3>
						<div className="flex items-center space-x-2">
							<span className="text-3xl font-bold text-blue-600">
								{image.faces?.length || 0}
							</span>
							<span className="text-gray-600 dark:text-gray-400">
								faces identified in this photo
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SharedImageDetail;
