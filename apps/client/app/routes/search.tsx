import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { BackButton } from "~/components/BackButton";
import { MainContainer } from "~/components/MainContainer";
import TagPersonModal from "~/components/TagPersonModal";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import {
	ignoreFace,
	searchFaces,
	unignoreFace,
	updateFace,
} from "../utils/api";

const SearchPage = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [results, setResults] = useState<any[]>([]);
	const [sourceFace, setSourceFace] = useState<{
		faceId: number;
		personId: string | null;
		imagePath?: string;
		boundingBox?: { top: number; left: number; right: number; bottom: number };
		originalWidth?: number;
		originalHeight?: number;
	} | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [showPossible, setShowPossible] = useState(false);
	const [showIgnored, setShowIgnored] = useState(false);
	const [taggingFaceId, setTaggingFaceId] = useState<number | null>(null);
	const [showFacesInGrid, setShowFacesInGrid] = useState(false);

	const faceId = searchParams.get("faceId");
	const albumId = searchParams.get("albumId");
	const shareToken = searchParams.get("shareToken");

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !results.length) return null;
		return results.find((img: any) => img.imageId === selectedImageId) || null;
	}, [selectedImageId, results]);

	const { confident, possible, ignored } = useMemo(() => {
		const filtered = results.filter((f) => !f.hidden);
		const nonIgnored = filtered.filter((f) => !f.isIgnored);

		const conf = nonIgnored.filter((f) => 1 - (f.distance || 0) >= 0.5);
		const poss = nonIgnored.filter(
			(f) => 1 - (f.distance || 0) < 0.5 && 1 - (f.distance || 0) >= 0.2,
		);
		const ign = filtered.filter((f) => f.isIgnored);

		return { confident: conf, possible: poss, ignored: ign };
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
			toast.success("Match confirmed");
		} catch (err) {
			console.error("Failed to confirm match:", err);
			toast.error("Failed to confirm match");
		}
	};

	const handleReject = async (faceId: number) => {
		if (sourceFace?.personId) {
			try {
				await ignoreFace(faceId, sourceFace.personId);
				setResults((prev) =>
					prev.map((f) =>
						f.faceId === faceId ? { ...f, isIgnored: true } : f,
					),
				);
				toast.success("Match ignored");
			} catch (err) {
				console.error("Failed to ignore face:", err);
				toast.error("Failed to ignore match");
			}
		} else {
			// Fallback for when there is no person context
			setResults((prev) =>
				prev.map((f) => (f.faceId === faceId ? { ...f, hidden: true } : f)),
			);
		}
	};

	const handleRestore = async (faceId: number) => {
		if (sourceFace?.personId) {
			try {
				await unignoreFace(faceId, sourceFace.personId);
				setResults((prev) =>
					prev.map((f) =>
						f.faceId === faceId ? { ...f, isIgnored: false } : f,
					),
				);
				toast.success("Match restored");
			} catch (err) {
				console.error("Failed to restore face:", err);
				toast.error("Failed to restore match");
			}
		}
	};

	const onTagComplete = () => {
		setTaggingFaceId(null);
		// If we had a pending confirmation, we should probably re-fetch or update sourceFace
		// For now, let's just re-trigger the search to get updated person info
		window.location.reload();
	};

	const renderFaceGrid = (faces: any[], startIndex: number) => (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full auto-rows-[300px] md:auto-rows-[350px] grid-flow-dense">
			{faces.map((face, index) => {
				const width = face.originalWidth || 0;
				const height = face.originalHeight || 0;
				const spanClass = getBentoSpanClass(width, height, startIndex + index);
				const similarity = ((1 - (face.distance || 0)) * 100).toFixed(1);
				const isConfirmed =
					face.isConfirmed ||
					(!!face.personId && face.personId === sourceFace?.personId);

				return (
					<div
						key={face.faceId || index}
						className={`relative group rounded-3xl overflow-hidden border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 transition-all hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:shadow-xl dark:hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] ${spanClass}`}
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
							className="w-full h-full object-cover cursor-pointer"
							onClick={() => setSelectedImage(face)}
						/>

						{/* Match Info Overlay */}
						<div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 dark:from-black/90 via-transparent to-transparent opacity-100 transition-opacity pointer-events-none" />

						<div className="absolute bottom-0 left-0 w-full p-5 pointer-events-none">
							<div className="flex flex-col gap-2">
								<div className="flex flex-wrap items-center gap-2">
									<span
										className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border backdrop-blur-md ${
											Number(similarity) > 70
												? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
												: Number(similarity) > 50
													? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border-indigo-500/30"
													: "bg-gray-500/20 text-gray-600 dark:text-zinc-300 border-gray-500/30"
										}`}
									>
										{similarity}% Match
									</span>
									{isConfirmed && (
										<span className="bg-emerald-500/30 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1 backdrop-blur-md">
											<Check size={12} strokeWidth={3} /> Confirmed
										</span>
									)}
								</div>

								<div className="flex flex-col gap-0.5">
									{face.personName ? (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setTaggingFaceId(face.faceId);
											}}
											className="text-white font-bold truncate drop-shadow-lg text-lg text-left hover:text-indigo-300 hover:underline decoration-2 underline-offset-4 transition-all pointer-events-auto"
										>
											{face.personName}
										</button>
									) : (
										<button
											type="button"
											onClick={(e) => {
												e.stopPropagation();
												setTaggingFaceId(face.faceId);
											}}
											className="flex items-center gap-1.5 text-white/90 hover:text-white transition-colors pointer-events-auto w-fit"
										>
											<span className="text-sm font-black italic drop-shadow-md underline decoration-indigo-500/50 underline-offset-4">
												Name this person
											</span>
										</button>
									)}
									{width > 0 && height > 0 && (
										<span className="text-white/60 text-[10px] font-black tracking-[0.2em] mt-1">
											{width} × {height} PX
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Feedback Actions */}
						{!isConfirmed && !shareToken && !face.isIgnored && (
							<div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 pointer-events-auto">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleConfirm(face);
									}}
									className="p-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-90 border border-emerald-400/20"
									title="Correct Match"
								>
									<Check size={20} strokeWidth={2.5} />
								</button>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleReject(face.faceId);
									}}
									className="p-3 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-90 border border-rose-400/20"
									title="Not a Match"
								>
									<X size={20} strokeWidth={2.5} />
								</button>
							</div>
						)}

						{/* Restore Action for Ignored Faces */}
						{face.isIgnored && !shareToken && (
							<div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 pointer-events-auto">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										handleRestore(face.faceId);
									}}
									className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 border border-zinc-700/50 font-bold text-sm flex items-center gap-2"
									title="Restore Match"
								>
									Restore
								</button>
							</div>
						)}

						{/* Bounding Box Indicator */}
						{showFacesInGrid && face.boundingBox && width > 0 && height > 0 && (
							<div
								className="absolute border-[3px] border-indigo-500 bg-indigo-500/10 rounded-xl pointer-events-none transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-20"
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
		<MainContainer>
			<BackButton shareToken={shareToken || undefined} />

			<div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-8 border-b border-gray-200 dark:border-zinc-900 pb-12">
				<div className="flex-1">
					<div className="flex items-center gap-4 mb-6">
						<div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm dark:shadow-[0_0_20px_rgba(99,102,241,0.1)]">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Search Icon</title>
								<circle cx="11" cy="11" r="8" />
								<path d="m21 21-4.3-4.3" />
							</svg>
						</div>
						<h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-gray-900 dark:text-white">
							Search Results
						</h1>
					</div>

					<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
						{/* Source Face Prominent Indicator */}
						{sourceFace?.imagePath && (
							<div className="flex items-center gap-4 bg-gray-100 dark:bg-zinc-900/60 p-2 pr-6 rounded-[2rem] border border-gray-200 dark:border-zinc-800/50 shadow-xl group">
								<div className="w-16 h-16 rounded-[1.25rem] overflow-hidden bg-gray-200 dark:bg-zinc-800 relative shadow-inner">
									{sourceFace.boundingBox &&
									sourceFace.originalWidth &&
									sourceFace.originalHeight ? (
										<div
											className="w-full h-full bg-no-repeat transition-transform duration-500 group-hover:scale-110"
											style={{
												backgroundImage: `url(${sourceFace.imagePath})`,
												backgroundSize: `${(sourceFace.originalWidth / (sourceFace.boundingBox.right - sourceFace.boundingBox.left)) * 100}% ${(sourceFace.originalHeight / (sourceFace.boundingBox.bottom - sourceFace.boundingBox.top)) * 100}%`,
												backgroundPosition: `${(sourceFace.boundingBox.left / (sourceFace.originalWidth - (sourceFace.boundingBox.right - sourceFace.boundingBox.left))) * 100}% ${(sourceFace.boundingBox.top / (sourceFace.originalHeight - (sourceFace.boundingBox.bottom - sourceFace.boundingBox.top))) * 100}%`,
											}}
										/>
									) : (
										<img
											src={sourceFace.imagePath}
											alt="Source"
											className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
										/>
									)}
								</div>
								<div className="flex flex-col gap-0.5">
									<span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
										Searching for
									</span>
									<div className="flex items-center gap-2">
										<span className="text-lg font-black text-gray-900 dark:text-white">
											Face #{faceId}
										</span>
										{sourceFace.personId ? (
											<button
												type="button"
												onClick={() => setTaggingFaceId(sourceFace.faceId)}
												className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
											>
												<Check size={8} strokeWidth={3} />{" "}
												{sourceFace.personId.split("-")[0]}...
											</button>
										) : (
											<button
												type="button"
												onClick={() => setTaggingFaceId(sourceFace.faceId)}
												className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline decoration-2 underline-offset-4"
											>
												Name person
											</button>
										)}
									</div>
								</div>
							</div>
						)}

						{!sourceFace?.imagePath && faceId && (
							<div className="flex flex-wrap items-center gap-3 text-gray-600 dark:text-zinc-400 font-semibold bg-gray-100 dark:bg-zinc-900/40 backdrop-blur-sm px-5 py-3 rounded-2xl border border-gray-200 dark:border-zinc-800/50 shadow-xl">
								<span className="flex items-center gap-2 text-sm">
									<div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500" />
									Face ID{" "}
									<span className="text-indigo-600 dark:text-indigo-400 font-black">
										#{faceId}
									</span>
								</span>
							</div>
						)}
					</div>
				</div>

				{!loading && (
					<div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
						<button
							type="button"
							onClick={() => setShowFacesInGrid(!showFacesInGrid)}
							className={`flex items-center gap-2 px-5 py-4 rounded-[2rem] font-black transition-all border shadow-lg ${
								showFacesInGrid
									? "bg-indigo-600 dark:bg-indigo-600 border-indigo-500 text-white"
									: "bg-gray-50 dark:bg-zinc-900/60 border-gray-200 dark:border-zinc-800/50 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
							}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<title>Highlight Faces</title>
								<path d="M3 7V5a2 2 0 0 1 2-2h2" />
								<path d="M17 3h2a2 2 0 0 1 2 2v2" />
								<path d="M21 17v2a2 2 0 0 1-2 2h-2" />
								<path d="M7 21H5a2 2 0 0 1-2-2v-2" />
								<circle cx="12" cy="12" r="3" />
								<path d="m19 19-2-2" />
							</svg>
							<span className="hidden sm:inline">Highlight Faces</span>
						</button>

						<div className="flex gap-3">
							<div className="px-6 py-3 bg-gray-50 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-xl min-w-[110px]">
								<span className="text-gray-500 dark:text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] block mb-1">
									Matches
								</span>
								<span className="text-2xl font-black text-gray-900 dark:text-white">
									{confident.length + possible.length}
								</span>
							</div>
							<div className="px-6 py-3 bg-gray-50 dark:bg-zinc-900/60 backdrop-blur-xl border border-gray-200 dark:border-zinc-800/50 rounded-2xl shadow-xl min-w-[110px]">
								<span className="text-gray-500 dark:text-zinc-500 text-[9px] font-black uppercase tracking-[0.2em] block mb-1">
									Precision
								</span>
								<span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
									High
								</span>
							</div>
						</div>
					</div>
				)}
			</div>

			{loading ? (
				<div className="flex flex-col justify-center items-center py-40 gap-6">
					<div className="relative w-20 h-20">
						<div className="absolute inset-0 border-[8px] border-indigo-100 dark:border-indigo-500/10 rounded-full" />
						<div className="absolute inset-0 border-[8px] border-indigo-600 dark:border-indigo-500 border-t-transparent rounded-full animate-spin" />
					</div>
					<div className="text-center">
						<h2 className="text-xl text-gray-900 dark:text-white font-black tracking-tighter mb-1">
							Analyzing Biometrics
						</h2>
						<p className="text-sm text-gray-500 dark:text-zinc-500 font-medium animate-pulse tracking-wide">
							Scanning neural embeddings...
						</p>
					</div>
				</div>
			) : error ? (
				<div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 p-6 rounded-3xl flex items-center gap-5 shadow-sm">
					<div className="p-4 bg-rose-100 dark:bg-rose-500/20 rounded-2xl">
						<X size={24} strokeWidth={3} />
					</div>
					<div>
						<h3 className="font-black text-lg mb-0.5">Search Failed</h3>
						<p className="text-sm opacity-80 font-medium">{error}</p>
					</div>
				</div>
			) : confident.length === 0 && possible.length === 0 ? (
				<div className="text-center py-40 bg-gray-50 dark:bg-zinc-900/30 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-[3rem]">
					<div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 dark:text-zinc-600">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="32"
							height="32"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						>
							<title>Empty Results</title>
							<path d="M17 6.1H3" />
							<path d="M21 12.1H3" />
							<path d="M15.1 18H3" />
						</svg>
					</div>
					<p className="text-xl text-gray-600 dark:text-zinc-400 font-black tracking-tight">
						No matches found
					</p>
				</div>
			) : (
				<div className="space-y-20">
					{/* Confident Matches Section */}
					{confident.length > 0 && (
						<section>
							<div className="flex items-center gap-4 mb-8">
								<div className="relative h-10 flex items-center">
									<div className="w-3 h-10 bg-emerald-500/30 dark:bg-emerald-500/40 rounded-full blur-md absolute" />
									<div className="w-3 h-10 bg-emerald-500 rounded-full relative z-10" />
								</div>
								<div>
									<h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
										Confident Matches
									</h2>
									<span className="text-emerald-600 dark:text-emerald-500/80 text-[10px] font-black uppercase tracking-[0.3em] block">
										HIGH ACCURACY NEURAL MATCH
									</span>
								</div>
							</div>
							{renderFaceGrid(confident, 0)}
						</section>
					)}

					{/* Possible Matches Section */}
					{possible.length > 0 && (
						<section className="pt-20 border-t border-gray-200 dark:border-zinc-900">
							<div className="flex flex-col gap-10">
								<div className="flex items-center justify-between flex-wrap gap-6">
									<div className="flex items-center gap-4">
										<div className="relative h-10 flex items-center">
											<div className="w-3 h-10 bg-amber-500/30 dark:bg-amber-500/40 rounded-full blur-md absolute" />
											<div className="w-3 h-10 bg-amber-500 rounded-full relative z-10" />
										</div>
										<div>
											<h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
												Possible Matches
											</h2>
											<span className="text-amber-600 dark:text-amber-500/80 text-[10px] font-black uppercase tracking-[0.3em] block">
												LOW CONFIDENCE CORRELATION
											</span>
										</div>
									</div>

									<button
										type="button"
										onClick={() => setShowPossible(!showPossible)}
										className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all border shadow-lg group ${
											showPossible
												? "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700"
												: "bg-indigo-600 dark:bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95"
										}`}
									>
										{showPossible ? (
											<>
												Hide Suggestions{" "}
												<ChevronUp
													size={20}
													strokeWidth={3}
													className="group-hover:-translate-y-1 transition-transform"
												/>
											</>
										) : (
											<>
												Want to see more?{" "}
												<ChevronDown
													size={20}
													strokeWidth={3}
													className="group-hover:translate-y-1 transition-transform animate-bounce"
												/>
											</>
										)}
									</button>
								</div>

								{showPossible && renderFaceGrid(possible, confident.length)}
							</div>
						</section>
					)}

					{/* Ignored Matches Section */}
					{ignored.length > 0 && (
						<section className="pt-20 border-t border-gray-200 dark:border-zinc-900 opacity-60 hover:opacity-100 transition-opacity">
							<div className="flex flex-col gap-10">
								<div className="flex items-center justify-between flex-wrap gap-6">
									<div className="flex items-center gap-4">
										<div className="relative h-10 flex items-center">
											<div className="w-3 h-10 bg-gray-500/30 dark:bg-zinc-500/40 rounded-full blur-md absolute" />
											<div className="w-3 h-10 bg-gray-500 dark:bg-zinc-500 rounded-full relative z-10" />
										</div>
										<div>
											<h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
												Ignored Matches
											</h2>
											<span className="text-gray-600 dark:text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] block mt-1.5">
												HIDDEN BY YOU
											</span>
										</div>
									</div>

									<button
										type="button"
										onClick={() => setShowIgnored(!showIgnored)}
										className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black transition-all border shadow-lg group ${
											showIgnored
												? "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-zinc-700"
												: "bg-gray-800 dark:bg-zinc-800 border-gray-700 dark:border-zinc-700 text-white hover:bg-gray-700 dark:hover:bg-zinc-700 hover:shadow-gray-500/30 active:scale-95"
										}`}
									>
										{showIgnored ? (
											<>
												Hide Ignored{" "}
												<ChevronUp
													size={20}
													strokeWidth={3}
													className="group-hover:-translate-y-1 transition-transform"
												/>
											</>
										) : (
											<>
												Review Ignored{" "}
												<ChevronDown
													size={20}
													strokeWidth={3}
													className="group-hover:translate-y-1 transition-transform animate-bounce"
												/>
											</>
										)}
									</button>
								</div>

								{showIgnored &&
									renderFaceGrid(ignored, confident.length + possible.length)}
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
				isSearchMode={true}
			/>

			{taggingFaceId && (
				<TagPersonModal
					faceId={taggingFaceId}
					currentPersonId={
						taggingFaceId === sourceFace?.faceId
							? sourceFace.personId
							: results.find((f) => f.faceId === taggingFaceId)?.personId
					}
					onClose={onTagComplete}
				/>
			)}
		</MainContainer>
	);
};

export default SearchPage;
