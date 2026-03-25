import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import type { FC } from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import { useSearchParams } from "react-router-dom";
import { AddToAlbumModal } from "~/components/AddToAlbumModal";
import { BulkActionBar } from "~/components/BulkActionBar";
import { CompactListView } from "~/components/CompactListView";
import type { ImageFromDB } from "~/interface";
import { deleteImage, fetchImages } from "~/utils/api";
import axiosAPI from "~/utils/axios";
import ImageGridItem from "./ImageGridItem";
import ImageModal from "./ImageModal";

const ImagesList: FC = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
	const [isBatchProcessing, setIsBatchProcessing] = useState(false);

	const queryClient = useQueryClient();

	const {
		data,
		isLoading,
		isError,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["images"],
		queryFn: fetchImages,
		getNextPageParam: (lastPage) =>
			lastPage?.data?.pagination?.nextCursor || null,
		initialPageParam: null as string | null,
	});

	const images = useMemo(() => {
		return data?.pages.flatMap((page) => page?.data?.images || []) || [];
	}, [data]);

	const { ref, inView } = useInView({
		rootMargin: "200px",
	});

	useEffect(() => {
		if (inView && hasNextPage && !isFetchingNextPage) {
			fetchNextPage();
		}
	}, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

	const selectedImageId = searchParams.get("imageId");
	const selectedImage = useMemo(() => {
		if (!selectedImageId || !images) return null;
		return images.find((img: any) => img.imageId === selectedImageId) || null;
	}, [selectedImageId, images]);

	const handleImageClick = (image: ImageFromDB) => {
		setSearchParams((prev) => {
			prev.set("imageId", image.imageId);
			return prev;
		});
	};

	const unSelectImage = () => {
		setSearchParams((prev) => {
			prev.delete("imageId");
			return prev;
		});
	};

	const handleDeleteImage = async (imageId: string) => {
		try {
			await deleteImage(imageId);
			queryClient.invalidateQueries({ queryKey: ["images"] });
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
			queryClient.invalidateQueries({ queryKey: ["images"] });
			setSelectedIds(new Set());
		} catch (error) {
			console.error("Bulk delete failed:", error);
		} finally {
			setIsBatchProcessing(false);
		}
	};

	const handleBatchAddToAlbum = async (albumId: string) => {
		const ids = Array.from(selectedIds);
		setIsBatchProcessing(true);
		try {
			await axiosAPI.post(`/albums/${albumId}/images`, {
				imageIds: ids,
			});
			queryClient.invalidateQueries({ queryKey: ["images", albumId] });
			setIsAddToAlbumOpen(false);
			setSelectedIds(new Set());
			alert(`Successfully added ${ids.length} photos to the album.`);
		} catch (error) {
			console.error("Batch add to album failed:", error);
			alert("Failed to add photos to album. Please try again.");
		} finally {
			setIsBatchProcessing(false);
		}
	};

	const handleBulkDownload = async () => {
		if (!images) return;
		const selectedImages = images.filter((img) => selectedIds.has(img.imageId));

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
			link.download = "my-photos.zip";
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

	if (isLoading)
		return (
			<div className="flex justify-center py-20">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
			</div>
		);
	if (isError)
		return (
			<div className="text-center py-20 text-zinc-500">
				Error loading images.
			</div>
		);

	return (
		<div className="w-full space-y-5">
			{/* View Controls */}
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center space-x-2">
					<span>Photos</span>
					<span className="ml-2 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] rounded-full border border-zinc-200 dark:border-zinc-700">
						{images?.length || 0}
					</span>
				</h2>
				<div className="bg-zinc-100 dark:bg-zinc-900 p-1 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center shadow-sm">
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						className={`p-2 rounded-xl transition-all ${
							viewMode === "grid"
								? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm"
								: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
						}`}
						title="Bento Grid"
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
						className={`p-2 rounded-xl transition-all ${
							viewMode === "list"
								? "bg-white dark:bg-zinc-800 text-indigo-500 shadow-sm"
								: "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
						}`}
						title="List View"
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
			</div>

			{viewMode === "grid" ? (
				<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 w-full">
					{images?.map((image) => {
						const width = image.originalSize?.width || 0;
						const height = image.originalSize?.height || 0;

						return (
							<div
								key={image.imageId}
								className="relative aspect-square overflow-hidden rounded-xl"
							>
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
									className="cursor-pointer rounded-xl transition-transform duration-300 hover:scale-[1.02] shadow-sm w-full h-full object-cover"
									onClick={() => handleImageClick(image)}
									onDelete={handleDeleteImage}
								/>
							</div>
						);
					})}
				</div>
			) : (
				<div className="p-4">
					<CompactListView
						images={images || []}
						selectedIds={selectedIds}
						onToggleSelect={toggleSelect}
						onImageClick={handleImageClick}
					/>
				</div>
			)}

			{/* Infinite Scroll Trigger */}
			<div ref={ref} className="w-full flex justify-center py-8">
				{isFetchingNextPage && (
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
				)}
			</div>

			<ImageModal
				image={selectedImage}
				images={images || []}
				onClose={unSelectImage}
				onDelete={handleDeleteImage}
				onNavigate={handleImageClick}
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
		</div>
	);
};

export default ImagesList;
