import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchImage, deleteImage } from "../utils/api";
import DisplayImage from "../Images/DisplayImage";
import { useState } from "react";

const ImageDetail = () => {
	const { imageId } = useParams<{ imageId: string }>();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isDeleting, setIsDeleting] = useState(false);

	const {
		data: imageResponse,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["image", imageId],
		queryFn: () => fetchImage(imageId!),
		enabled: !!imageId,
	});

	const deleteMutation = useMutation({
		mutationFn: deleteImage,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["images"] });
			navigate("/home");
		},
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
					to="/home"
					className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
				>
					Back to Home
				</Link>
			</div>
		);
	}

	const image = imageResponse.data;

	const handleDelete = () => {
		if (
			window.confirm(
				"Are you sure you want to delete this image? This will also remove all detected faces and cannot be undone."
			)
		) {
			setIsDeleting(true);
			deleteMutation.mutate(imageId!);
		}
	};

	return (
		<div className="container mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
			<div className="flex justify-between items-center mb-8">
				<Link
					to="/home"
					className="text-blue-600 dark:text-blue-400 hover:underline font-medium transition-colors"
				>
					&larr; Back to Home
				</Link>
				<button
					onClick={handleDelete}
					disabled={isDeleting}
					className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-5 w-5"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
					<span>{isDeleting ? "Deleting..." : "Delete Image"}</span>
				</button>
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
							<span className="text-gray-600 dark:text-gray-400">ID:</span>
							<span className="text-gray-900 dark:text-white font-mono text-sm">
								{image.imageId}
							</span>
						</div>
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

export default ImageDetail;
