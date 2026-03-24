import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import { searchFaces } from "../utils/api";

const SearchPage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [results, setResults] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const faceId = searchParams.get("faceId");
	const albumId = searchParams.get("albumId");
	const shareToken = searchParams.get("shareToken");

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !results.length) return null;
		return results.find((img: any) => img.imageId === selectedImageId) || null;
	}, [selectedImageId, results]);

	const setSelectedImage = (image: any | null) => {
		setSearchParams((prev) => {
			if (image) {
				prev.set("imageId", image.imageId);
			} else {
				prev.delete("imageId");
			}
			return prev;
		});
	};

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
					shareToken: shareToken || undefined,
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
	}, [faceId, albumId, shareToken]);

	return (
		<div className="container mx-auto px-4 py-8">
			<Link
				to={shareToken ? `/share/${shareToken}` : "/home"}
				className="text-blue-600 dark:text-blue-400 hover:underline mb-8 block font-medium transition-colors"
			>
				&larr; Back to {shareToken ? "Album" : "Home"}
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
				<div
					className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative"
					role="alert"
				>
					<strong className="font-bold">Error! </strong>
					<span className="block sm:inline">{error}</span>
				</div>
			) : results.length === 0 ? (
				<div className="text-center py-20">
					<p className="text-xl text-gray-600 dark:text-gray-400">
						No matching faces found.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full auto-rows-[150px] md:auto-rows-[200px] grid-flow-dense">
					{results.map((face, index) => {
						const width = face.originalSize?.width || 0;
						const height = face.originalSize?.height || 0;
						const spanClass = getBentoSpanClass(width, height, index);
						const similarity = ((1 - (face.distance || 0)) * 100).toFixed(1);

						return (
							<div
								key={face.faceId || index}
								className={`relative group ${spanClass}`}
							>
								<ImageGridItem
									image={{
										id: face.imageId || `face-${index}`,
										width,
										height,
										url: face.imagePath,
										alt: `Match ${index + 1}`,
									}}
									onDelete={() => {}}
									shared={true}
									className="w-full h-full object-cover rounded-xl"
									onClick={() => setSelectedImage(face)}
								/>

								{/* Match Info Overlay */}
								<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 rounded-xl pointer-events-none" />
								<div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent rounded-b-xl pointer-events-none">
									<div className="flex items-end justify-between">
										<div className="flex flex-col">
											<span className="text-white text-xs font-bold drop-shadow-md">
												{similarity}% Match
											</span>
											{face.personName && (
												<span className="text-white/90 text-[10px] drop-shadow-md truncate max-w-[100px]">
													{face.personName}
												</span>
											)}
										</div>
										{face.boundingBox && (
											<div
												className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm mb-0.5"
												title="Face Detected"
											/>
										)}
									</div>
								</div>

								{/* Bounding Box (Only on hover to keep it clean?) Or maybe subtle? */}
								{face.boundingBox && width > 0 && height > 0 && (
									<div
										className="absolute border border-white/50 bg-white/10 rounded-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
										style={{
											left: `${(face.boundingBox.left / width) * 100}%`,
											top: `${(face.boundingBox.top / height) * 100}%`,
											width: `${((face.boundingBox.right - face.boundingBox.left) / width) * 100}%`,
											height: `${((face.boundingBox.bottom - face.boundingBox.top) / height) * 100}%`,
										}}
									/>
								)}
							</div>
						);
					})}
				</div>
			)}

			<ImageModal
				image={selectedImage}
				images={results}
				albumId={albumId || undefined}
				shareToken={shareToken || undefined}
				onClose={() => setSelectedImage(null)}
				onNavigate={(img) => setSelectedImage(img)}
			/>
		</div>
	);
};

export default SearchPage;
