import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import TagPersonModal from "~/components/TagPersonModal";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import { searchFaces, updateFace } from "../utils/api";

const SearchPage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [results, setResults] = useState<any[]>([]);
	const [sourceFace, setSourceFace] = useState<{
		faceId: number;
		personId: string | null;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showPossible, setShowPossible] = useState(false);
	const [taggingFaceId, setTaggingFaceId] = useState<number | null>(null);
	const [pendingConfirmation, setPendingConfirmation] = useState<number | null>(
		null,
	);

	const faceId = searchParams.get("faceId");
	const albumId = searchParams.get("albumId");
	const shareToken = searchParams.get("shareToken");

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !results.length) return null;
		return results.find((img: any) => img.imageId === selectedImageId) || null;
	}, [selectedImageId, results]);

	const { confident, possible } = useMemo(() => {
		const filtered = results.filter((f) => !f.hidden);
		const conf = filtered.filter((f) => 1 - (f.distance || 0) >= 0.5);
		const poss = filtered.filter(
			(f) => 1 - (f.distance || 0) < 0.5 && 1 - (f.distance || 0) >= 0.2,
		);
		return { confident: conf, possible: poss };
	}, [results]);

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
					setSourceFace(response.data.sourceFace || null);
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

	const handleConfirm = async (face: any) => {
		if (!sourceFace) return;

		if (!sourceFace.personId) {
			// If source face doesn't have a person, we need to tag it first
			setPendingConfirmation(face.faceId);
			setTaggingFaceId(sourceFace.faceId);
			return;
		}

		try {
			await updateFace(face.faceId, { personId: sourceFace.personId });
			// Update local state to show it's confirmed
			setResults((prev) =>
				prev.map((f) =>
					f.faceId === face.faceId
						? { ...f, personId: sourceFace.personId, isConfirmed: true }
						: f,
				),
			);
		} catch (err) {
			console.error("Failed to confirm match:", err);
		}
	};

	const handleReject = (faceId: number) => {
		setResults((prev) =>
			prev.map((f) => (f.faceId === faceId ? { ...f, hidden: true } : f)),
		);
	};

	const onTagComplete = () => {
		setTaggingFaceId(null);
		// If we had a pending confirmation, we should probably re-fetch or update sourceFace
		// For now, let's just re-trigger the search to get updated person info
		window.location.reload();
	};

	const renderFaceGrid = (faces: any[], startIndex: number) => (
		<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full auto-rows-[200px] md:auto-rows-[250px] grid-flow-dense">
			{faces.map((face, index) => {
				const width = face.originalSize?.width || 0;
				const height = face.originalSize?.height || 0;
				const spanClass = getBentoSpanClass(width, height, startIndex + index);
				const similarity = ((1 - (face.distance || 0)) * 100).toFixed(1);
				const isConfirmed =
					face.isConfirmed || face.personId === sourceFace?.personId;

				return (
					<div
						key={face.faceId || index}
						className={`relative group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900/50 transition-all hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] ${spanClass}`}
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
							className="w-full h-full object-cover"
							onClick={() => setSelectedImage(face)}
						/>

						{/* Match Info Overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent opacity-100 transition-opacity" />

						<div className="absolute bottom-0 left-0 w-full p-4 pointer-events-none">
							<div className="flex flex-col gap-1">
								<div className="flex items-center gap-2">
									<span
										className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
											Number(similarity) > 70
												? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
												: Number(similarity) > 50
													? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
													: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
										}`}
									>
										{similarity}% Match
									</span>
									{isConfirmed && (
										<span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
											<Check size={10} /> Confirmed
										</span>
									)}
								</div>
								{face.personName && (
									<span className="text-white text-sm font-medium truncate drop-shadow-md">
										{face.personName}
									</span>
								)}
							</div>
						</div>

						{/* Feedback Actions */}
						{!isConfirmed && !shareToken && (
							<div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleConfirm(face);
									}}
									className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
									title="Correct Match"
								>
									<Check size={16} />
								</button>
								<button
									onClick={(e) => {
										e.stopPropagation();
										handleReject(face.faceId);
									}}
									className="p-2 bg-rose-500 hover:bg-rose-600 text-white rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
									title="Not a Match"
								>
									<X size={16} />
								</button>
							</div>
						)}

						{/* Bounding Box */}
						{face.boundingBox && width > 0 && height > 0 && (
							<div
								className="absolute border-2 border-indigo-500/50 bg-indigo-500/10 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
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
	);

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
				<Link
					to={shareToken ? `/share/${shareToken}` : "/home"}
					className="inline-flex items-center gap-2 text-zinc-400 hover:text-white mb-8 transition-colors group"
				>
					<span className="group-hover:-translate-x-1 transition-transform">
						&larr;
					</span>
					Back to {shareToken ? "Album" : "Dashboard"}
				</Link>

				<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
					<div>
						<h1 className="text-4xl font-black tracking-tight text-white mb-2">
							Search Results
						</h1>
						{faceId && (
							<p className="text-zinc-500 font-medium">
								Displaying matches for face{" "}
								<span className="text-indigo-400">#{faceId}</span>
								{sourceFace?.personId && (
									<>
										{" "}
										linked to{" "}
										<span className="text-indigo-400">
											Person ID {sourceFace.personId.split("-")[0]}...
										</span>
									</>
								)}
							</p>
						)}
					</div>

					{!loading && (
						<div className="flex gap-4">
							<div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
								<span className="text-zinc-500 text-sm block">
									Total Matches
								</span>
								<span className="text-xl font-bold">
									{confident.length + possible.length}
								</span>
							</div>
							<div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl">
								<span className="text-zinc-500 text-sm block">Accuracy</span>
								<span className="text-xl font-bold text-emerald-400">High</span>
							</div>
						</div>
					)}
				</div>

				{loading ? (
					<div className="flex flex-col justify-center items-center py-32 gap-4">
						<div className="relative w-16 h-16">
							<div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
							<div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
						</div>
						<p className="text-zinc-500 font-medium animate-pulse">
							Analyzing neural patterns...
						</p>
					</div>
				) : error ? (
					<div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-6 rounded-2xl flex items-center gap-4">
						<div className="p-3 bg-rose-500/20 rounded-xl">
							<X size={24} />
						</div>
						<div>
							<h3 className="font-bold text-lg">Search Failed</h3>
							<p className="opacity-80">{error}</p>
						</div>
					</div>
				) : confident.length === 0 && possible.length === 0 ? (
					<div className="text-center py-32 bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
						<p className="text-xl text-zinc-500 font-medium">
							No matches found with current parameters.
						</p>
					</div>
				) : (
					<div className="space-y-16">
						{/* Confident Matches Section */}
						{confident.length > 0 && (
							<section>
								<div className="flex items-center gap-3 mb-6">
									<div className="w-2 h-8 bg-emerald-500 rounded-full" />
									<h2 className="text-2xl font-bold">Confident Matches</h2>
									<span className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-2 py-1 rounded-md">
										HIGH ACCURACY
									</span>
								</div>
								{renderFaceGrid(confident, 0)}
							</section>
						)}

						{/* Possible Matches Section */}
						{possible.length > 0 && (
							<section className="pt-8 border-t border-zinc-900">
								<div className="flex flex-col gap-8">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="w-2 h-8 bg-amber-500 rounded-full" />
											<h2 className="text-2xl font-bold text-zinc-300">
												Possible Matches
											</h2>
											<span className="bg-amber-500/10 text-amber-400 text-xs font-bold px-2 py-1 rounded-md">
												LOW CONFIDENCE
											</span>
										</div>

										<button
											onClick={() => setShowPossible(!showPossible)}
											className="flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all border border-zinc-800"
										>
											{showPossible ? (
												<>
													Hide Suggestions <ChevronUp size={20} />
												</>
											) : (
												<>
													Want to see more? <ChevronDown size={20} />
												</>
											)}
										</button>
									</div>

									{showPossible && renderFaceGrid(possible, confident.length)}
								</div>
							</section>
						)}
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

				{taggingFaceId && (
					<TagPersonModal faceId={taggingFaceId} onClose={onTagComplete} />
				)}
			</div>
		</div>
	);
};

export default SearchPage;
