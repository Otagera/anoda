import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BulkActionBar } from "~/components/BulkActionBar";
import { MainContainer } from "~/components/MainContainer";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import { SelfieSearchModal } from "../components/SelfieSearchModal";
import { fetchSharedAlbum, searchFaces } from "../utils/api";

const SharedAlbumPage = () => {
	const { token } = useParams<{ token: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);
	const [filteredImageIds, setFilteredIds] = useState<Set<string> | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const { data: albumResponse, isLoading } = useQuery({
		queryKey: ["shared-album", token],
		queryFn: () => fetchSharedAlbum(token!),
		enabled: !!token,
	});

	const albumData = albumResponse?.data;
	const allImages = useMemo(() => albumData?.images || [], [albumData]);

	const displayedImages = useMemo(() => {
		if (!filteredImageIds) return allImages;
		return allImages.filter((img: any) => filteredImageIds.has(img.imageId));
	}, [allImages, filteredImageIds]);

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !allImages.length) return null;
		return (
			allImages.find((img: any) => img.imageId === selectedImageId) || null
		);
	}, [selectedImageId, allImages]);

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

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleBulkDownload = async () => {
		const selectedImages = allImages.filter((img: any) =>
			selectedIds.has(img.imageId),
		);

		const toastId = toast.loading(
			`Preparing ZIP with ${selectedIds.size} photos...`,
		);

		try {
			const zip = new JSZip();
			const folder = zip.folder("photos");

			for (let i = 0; i < selectedImages.length; i++) {
				const image = selectedImages[i];
				const response = await fetch(image.imagePath);
				const blob = await response.blob();

				// Get filename from path or use ID
				const fileName = `photo-${i + 1}-${image.imageId.slice(0, 8)}.jpg`;
				folder?.file(fileName, blob);

				if (i % 5 === 0) {
					toast.loading(`Zipping: ${i + 1}/${selectedImages.length}`, {
						id: toastId,
					});
				}
			}

			toast.loading("Generating ZIP file...", { id: toastId });
			const content = await zip.generateAsync({ type: "blob" });

			const url = window.URL.createObjectURL(content);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${albumData?.albumName || "album"}-photos.zip`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Download started!", { id: toastId });
			setSelectedIds(new Set());
		} catch (_error) {
			console.error("ZIP Error:", _error);
			toast.error("Failed to create ZIP. Please try again.", { id: toastId });
		}
	};

	const handleFaceSearch = async (faceId: number) => {
		const toastId = toast.loading("Finding matching photos...");
		try {
			const results = await searchFaces({
				faceId,
				shareToken: token,
				threshold: 0.6,
			});
			if (results?.data?.faces) {
				const ids = new Set(results.data.faces.map((f: any) => f.imageId));
				setFilteredIds(ids);
				toast.success(`Found ${ids.size} photos with this face`, {
					id: toastId,
				});
			}
		} catch (_error) {
			toast.error("Search failed", { id: toastId });
		}
	};

	if (isLoading) {
		return (
			<MainContainer className="flex justify-center items-center h-[60vh]">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage"></div>
			</MainContainer>
		);
	}

	if (!albumResponse?.data) {
		return (
			<MainContainer className="flex flex-col items-center justify-center h-[60vh] text-center">
				<h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
					Album Not Found
				</h1>
				<p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md leading-relaxed">
					This shared link may have expired or is invalid. Please contact the
					album owner for a new link.
				</p>
				<Link
					to="/"
					className="px-8 py-3 bg-sage text-white font-bold rounded-xl hover:bg-sage/90 transition-all shadow-lg shadow-sage/25 active:scale-95"
				>
					Return Home
				</Link>
			</MainContainer>
		);
	}

	return (
		<MainContainer>
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
				<div className="space-y-2">
					<div className="flex items-center space-x-2">
						<span className="px-2 py-0.5 bg-sage/10 text-sage rounded text-[10px] font-black uppercase tracking-widest border border-sage/20">
							Shared Album
						</span>
						{filteredImageIds && (
							<button
								type="button"
								onClick={() => setFilteredIds(null)}
								className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-[10px] font-bold uppercase hover:bg-zinc-200 transition-colors cursor-pointer"
							>
								Clear Filter &times;
							</button>
						)}
					</div>
					<h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
						{albumData.albumName}
					</h1>
					<p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
						{filteredImageIds
							? `Showing ${displayedImages.length} photos of you`
							: "Organized by the owner for you"}
					</p>
				</div>

				<div className="flex items-center space-x-3 w-full md:w-auto">
					<button
						type="button"
						className={`flex-1 md:flex-none px-8 py-3.5 font-bold rounded-2xl border transition-all flex items-center justify-center space-x-2 active:scale-95 shadow-xl ${
							filteredImageIds
								? "bg-sage text-white border-sage"
								: "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
						}`}
						onClick={() => setIsSelfieModalOpen(true)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className={`h-5 w-5 ${filteredImageIds ? "text-white" : "text-sage"}`}
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="Find My Face"
						>
							<title>Find My Face</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
							/>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<span>{filteredImageIds ? "Change Photo" : "Find My Face"}</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full auto-rows-[150px] md:auto-rows-[200px] grid-flow-dense">
				{displayedImages.map((image: any, index: number) => {
					const width = image.originalSize?.width || 0;
					const height = image.originalSize?.height || 0;

					// Determine if this specific image should be featured (e.g. exceptionally high res)
					const area = width * height;
					const isFeatured = area > 2000000;

					const spanClass = getBentoSpanClass(
						width,
						height,
						index,
						isFeatured,
					);

					return (
						<div key={image.imageId} className={`relative ${spanClass}`}>
							<ImageGridItem
								image={{
									id: image.imageId,
									width: width,
									height: height,
									url: image.imagePath,
									alt: image.imageId,
								}}
								onDelete={() => {}}
								onToggleSelect={toggleSelect}
								isSelected={selectedIds.has(image.imageId)}
								selectionMode={selectedIds.size > 0}
								shared={true}
								className="cursor-pointer rounded-xl transition-transform duration-300 hover:scale-[1.02] shadow-sm w-full object-cover"
								onClick={() => setSelectedImage(image)}
							/>
						</div>
					);
				})}
			</div>

			{displayedImages.length === 0 && (
				<div className="text-center py-32">
					<p className="text-zinc-500 font-medium">
						No photos found matching this filter.
					</p>
				</div>
			)}

			<ImageModal
				image={selectedImage}
				images={displayedImages}
				shareToken={token}
				onClose={() => setSelectedImage(null)}
				onNavigate={(img) => setSelectedImage(img)}
				onFaceSearch={handleFaceSearch}
			/>

			{isSelfieModalOpen && (
				<SelfieSearchModal
					token={token!}
					onClose={() => setIsSelfieModalOpen(false)}
					onResults={(results) => {
						const ids = new Set(results.map((r) => r.imageId));
						setFilteredIds(ids);
					}}
				/>
			)}

			<BulkActionBar
				selectedCount={selectedIds.size}
				onClear={() => setSelectedIds(new Set())}
				onDownload={handleBulkDownload}
			/>
		</MainContainer>
	);
};

export default SharedAlbumPage;
