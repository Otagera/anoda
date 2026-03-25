import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import JSZip from "jszip";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import { useParams, useSearchParams } from "react-router-dom";
import { AddToAlbumModal } from "~/components/AddToAlbumModal";
import { BackButton } from "~/components/BackButton";
import { BulkActionBar } from "~/components/BulkActionBar";
import { CompactListView } from "~/components/CompactListView";
import { MainContainer } from "~/components/MainContainer";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import { ShareModal } from "../components/ShareModal";
import {
	deleteImage,
	fetchAlbum,
	fetchImagesInAlbum,
	uploadImages,
} from "../utils/api";
import axiosAPI from "../utils/axios";
import { useUpload } from "../utils/UploadContext";

const AlbumPage = () => {
	const { albumId } = useParams();
	const queryClient = useQueryClient();
	const { addUploads } = useUpload();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [files, setFiles] = useState<FileList | null>(null);

	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
	const [isBatchProcessing, setIsBatchProcessing] = useState(false);

	const {
		data: imagesData,
		isLoading: isImagesDataLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["images", albumId],
		queryFn: ({ pageParam }) =>
			fetchImagesInAlbum({ albumId: albumId!, pageParam }),
		enabled: !!albumId,
		getNextPageParam: (lastPage) =>
			lastPage?.data?.pagination?.nextCursor || null,
		initialPageParam: null as string | null,
	});

	const { ref, inView } = useInView({
		rootMargin: "200px",
	});

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

	const { data: albumData, isLoading: isAlbumDataLoading } = useQuery({
		queryKey: [`album-${albumId}`, albumId],
		queryFn: () => fetchAlbum(albumId!),
		enabled: !!albumId,
	});

	const images = useMemo(() => {
		return (
			imagesData?.pages.flatMap(
				(page) => page?.data?.imagesInAlbum?.map((ia: any) => ia.images) || [],
			) || []
		);
	}, [imagesData]);

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !images.length) return null;
		return images.find((img: any) => img.imageId === selectedImageId) || null;
	}, [selectedImageId, images]);

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

	const handleDeleteImage = async (imageId: string) => {
		try {
			await deleteImage(imageId);
			queryClient.invalidateQueries({ queryKey: ["images", albumId] });
			setSelectedIds((prev) => {
				const next = new Set(prev);
				next.delete(imageId);
				return next;
			});
		} catch (error) {
			console.error(`Error deleting image with ID ${imageId}:`, error);
		}
	};

	const toggleSelect = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const handleBulkDelete = async () => {
		const ids = Array.from(selectedIds);
		setIsBatchProcessing(true);
		try {
			await Promise.all(ids.map((id) => deleteImage(id)));
			queryClient.invalidateQueries({ queryKey: ["images", albumId] });
			setSelectedIds(new Set());
		} catch (error) {
			console.error("Bulk delete failed:", error);
		} finally {
			setIsBatchProcessing(false);
		}
	};

	const handleBatchAddToAlbum = async (targetAlbumId: string) => {
		const ids = Array.from(selectedIds);
		setIsBatchProcessing(true);
		try {
			await axiosAPI.post(`/albums/${targetAlbumId}/images`, {
				imageIds: ids,
			});
			queryClient.invalidateQueries({ queryKey: ["images", targetAlbumId] });
			setIsAddToAlbumOpen(false);
			setSelectedIds(new Set());
			alert(`Successfully moved ${ids.length} photos.`);
		} catch (error) {
			console.error("Batch add to album failed:", error);
			alert("Failed to move photos. Please try again.");
		} finally {
			setIsBatchProcessing(false);
		}
	};

	const handleBulkDownload = async () => {
		const selectedImages = images.filter((img: any) =>
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
			link.download = `${albumData?.data?.albumName || "album"}-photos.zip`;
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

	const handleTriggerClustering = async () => {
		const toastId = toast.loading("Starting face clustering...");
		try {
			await axiosAPI.post(`/albums/${albumId}/cluster`);
			toast.success(
				"Face clustering started! The UI will update when finished.",
				{ id: toastId, duration: 5000 },
			);
		} catch (_error) {
			toast.error("Failed to start clustering.", { id: toastId });
		}
	};

	return (
		<MainContainer>
			<BackButton label="Back to Dashboard" to="/home" />

			<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
				<div>
					<h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
						{albumData?.data?.albumName}
					</h1>
					<div className="flex items-center space-x-2 mt-2">
						<span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded text-[10px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700">
							Album
						</span>
						<p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
							{albumId}
						</p>
					</div>
				</div>
				<div className="flex items-center space-x-3 w-full md:w-auto">
					{/* View Toggle */}
					<div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center shadow-sm mr-2">
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-xl transition-all ${viewMode === "grid"
								? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm"
								: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
								role="img"
								aria-label="Grid View"
							>
								<title>Grid View</title>
								<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={`p-2 rounded-xl transition-all ${viewMode === "list"
								? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm"
								: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
								role="img"
								aria-label="List View"
							>
								<title>List View</title>
								<path
									fillRule="evenodd"
									d="M3 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					</div>

					<button
						type="button"
						className="flex-1 md:flex-none px-5 py-2.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-95"
						onClick={handleTriggerClustering}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="Group Similar Faces"
						>
							<title>Group Similar Faces</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						<span className="text-sm font-semibold">Group Faces</span>
					</button>

					<button
						type="button"
						className="flex-1 md:flex-none px-5 py-2.5 text-zinc-700 dark:text-zinc-300 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-sm active:scale-95"
						onClick={() => setIsShareModalOpen(true)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="Share"
						>
							<title>Share</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/>
						</svg>
						<span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
							Share
						</span>
					</button>
					<button
						type="button"
						className="flex-1 md:flex-none px-6 py-2.5 text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all cursor-pointer shadow-lg shadow-indigo-500/25 active:scale-95 text-sm font-semibold"
						onClick={() => setIsUploadModalOpen(true)}
					>
						Upload Photos
					</button>
				</div>
			</div>

			{isImagesDataLoading && isAlbumDataLoading ? (
				<div className="flex justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
				</div>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full auto-rows-[150px] md:auto-rows-[200px] grid-flow-dense">
					{images.map((image: any, index: number) => {
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
										alt: image.imagePath,
									}}
									isSelected={selectedIds.has(image.imageId)}
									onToggleSelect={toggleSelect}
									selectionMode={selectedIds.size > 0}
									className="cursor-pointer rounded-xl transition-transform duration-300 hover:scale-[1.02] shadow-sm w-full object-cover"
									onClick={() => setSelectedImage(image)}
									onDelete={handleDeleteImage}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<CompactListView
					images={images}
					selectedIds={selectedIds}
					onToggleSelect={toggleSelect}
					onImageClick={setSelectedImage}
				/>
			)}

			{/* Infinite Scroll Trigger */}
			<div ref={ref} className="w-full flex justify-center py-8">
				{isFetchingNextPage && (
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
				)}
			</div>

			<ImageModal
				image={selectedImage}
				images={images}
				albumId={albumId}
				onClose={() => setSelectedImage(null)}
				onDelete={handleDeleteImage}
				onNavigate={(img) => setSelectedImage(img)}
			/>

			<BulkActionBar
				selectedCount={selectedIds.size}
				onClear={() => setSelectedIds(new Set())}
				onDelete={handleBulkDelete}
				onAddToAlbum={() => setIsAddToAlbumOpen(true)}
				onDownload={handleBulkDownload}
			/>

			{isAddToAlbumOpen && (
				<AddToAlbumModal
					onClose={() => setIsAddToAlbumOpen(false)}
					onConfirm={handleBatchAddToAlbum}
					isProcessing={isBatchProcessing}
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
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800">
						<h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
							Upload Photos
						</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
							Select images to add to this album.
						</p>

						<input
							type="file"
							multiple
							onChange={handleFileChange}
							className="mb-8 w-full text-sm text-zinc-500 dark:text-zinc-400
								file:mr-4 file:py-2.5 file:px-6
								file:rounded-xl file:border-0
								file:text-xs file:font-bold file:uppercase file:tracking-wider
								file:bg-indigo-50 file:text-indigo-600
								hover:file:bg-indigo-100
								dark:file:bg-zinc-800 dark:file:text-indigo-400
								cursor-pointer"
						/>

						{uploadImagesMutation.isError && (
							<div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-sm">
								{(uploadImagesMutation.error as any).response?.data?.message ||
									uploadImagesMutation.error.message ||
									"Failed to upload images"}
							</div>
						)}

						<div className="flex items-center space-x-3">
							<button
								type="button"
								className="flex-1 px-6 py-3 text-white bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50 font-bold shadow-lg shadow-indigo-500/25"
								onClick={handleUpload}
								disabled={uploadImagesMutation.isPending || !files}
							>
								{uploadImagesMutation.isPending ? "Uploading..." : "Upload"}
							</button>
							<button
								type="button"
								className="px-6 py-3 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-bold"
								onClick={() => setIsUploadModalOpen(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
		</MainContainer>
	);
};

export default AlbumPage;
