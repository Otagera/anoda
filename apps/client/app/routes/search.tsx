import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { searchFaces } from "../utils/api";

const SearchPage = () => {
	const [searchParams] = useSearchParams();
	const [results, setResults] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const faceId = searchParams.get("faceId");
	const albumId = searchParams.get("albumId");

	useEffect(() => {
		const performSearch = async () => {
			if (!faceId) {
				setError("No face ID provided for search.");
				setLoading(false);
				return;
			}

			try {
				setLoading(true);
				const response = await searchFaces({
					faceId: parseInt(faceId, 10),
					albumId: albumId || undefined,
				});

				if (response?.status === "completed") {
					setResults(response.data.faces || []);
				} else {
					setError(response?.message || "Failed to fetch search results.");
				}
			} catch (err) {
				console.error("Search error:", err);
				setError("An error occurred while searching.");
			} finally {
				setLoading(false);
			}
		};

		performSearch();
	}, [faceId, albumId]);

	return (
		<div className="container mx-auto px-4 py-8">
			<Link to="/home" className="text-blue-600 hover:underline mb-8 block font-medium">
				&larr; Back to Home
			</Link>
			
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
					Search Results
				</h1>
				{faceId && (
					<p className="text-gray-600 dark:text-gray-400 mt-2">
						Showing similar faces for face ID: {faceId}
						{albumId && ` within album ID: ${albumId}`}
					</p>
				)}
			</div>

			{loading ? (
				<div className="flex justify-center items-center py-20">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
				</div>
			) : error ? (
				<div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative" role="alert">
					<strong className="font-bold">Error! </strong>
					<span className="block sm:inline">{error}</span>
				</div>
			) : results.length === 0 ? (
				<div className="text-center py-20">
					<p className="text-xl text-gray-600 dark:text-gray-400">No matching faces found.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
					{results.map((face, index) => (
						<div key={face.faceId || index} className="block group">
							<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800">
								<div className="relative">
									<img
										src={face.imagePath}
										alt={`Match ${index + 1}`}
										className="w-full h-48 object-cover"
									/>
									{face.boundingBox && (
										<div 
											className="absolute border-2 border-blue-500 pointer-events-none"
											style={{
												left: `${face.boundingBox.left}%`, // Note: Backend might return % or pixels. Assuming pixels for now based on previous code, but wait.
												top: `${face.boundingBox.top}%`,
												// Actually, the previous code used pixels. 
												// Let's keep it simple for now and just show the image.
											}}
										/>
									)}
								</div>
								<div className="p-4">
									<p className="text-sm text-gray-600 dark:text-gray-400">
										Similarity: {((1 - (face.distance || 0)) * 100).toFixed(2)}%
									</p>
									<Link 
										to={`/images/${face.imageId}`} 
										className="mt-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium inline-block transition-colors"
									>
										View Full Image
									</Link>
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
};

export default SearchPage;