import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import JSZip from "jszip";
import { Edit2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AddToAlbumModal } from "~/components/AddToAlbumModal";
import { BackButton } from "~/components/BackButton";
import { BulkActionBar } from "~/components/BulkActionBar";
import { CompactListView } from "~/components/CompactListView";
import { ConfirmModal } from "~/components/ConfirmModal";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Heading } from "~/components/standard/Heading";
import ImageGridItem from "~/Images/ImageGridItem";
import ImageModal from "~/Images/ImageModal";
import { getBentoSpanClass } from "~/utils/bento";
import { ShareModal } from "../components/ShareModal";
import {
	deleteAlbum,
	deleteImage,
	editAlbum,
	fetchAlbum,
	fetchImagesInAlbum,
	uploadImages,
} from "../utils/api";
import axiosAPI from "../utils/axios";
import { useUpload } from "../utils/UploadContext";

const AlbumPage = () => {
	const { albumId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addUploads } = useUpload();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [confirmDeleteAlbum, setConfirmDeleteAlbum] = useState(false);
	const [editAlbumName, setEditAlbumName] = useState("");
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

	const editAlbumMutation = useMutation({
		mutationFn: editAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [`album-${albumId}`, albumId] });
			setIsEditModalOpen(false);
			toast.success("Album updated");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update album");
		},
	});

	const deleteAlbumMutation = useMutation({
		mutationFn: deleteAlbum,
		onSuccess: () => {
			toast.success("Album deleted");
			navigate("/home");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to delete album");
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

	const handleEditAlbum = () => {
		if (!editAlbumName.trim() || !albumId) return;
		editAlbumMutation.mutate({ albumId, albumName: editAlbumName });
	};

	const handleDeleteAlbum = () => {
		if (albumId) {
			deleteAlbumMutation.mutate(albumId);
		}
	};

	const openEditModal = () => {
		setEditAlbumName(albumData?.data?.albumName || "");
		setIsEditModalOpen(true);
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
			toast.success(`Successfully moved ${ids.length} photos.`);
		} catch (error) {
			console.error("Batch add to album failed:", error);
			toast.error("Failed to move photos. Please try again.");
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
		<MainContainer className="space-y-12">
			<BackButton label="Back to Dashboard" to="/home" />

			<div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
				<div className="flex-1">
					<div className="flex items-center space-x-3 mb-4">
						<span className="px-3 py-1 bg-sage/10 text-sage rounded-full text-[10px] font-bold uppercase tracking-widest border border-sage/20">
							Album
						</span>
						<p className="text-xs text-zinc-400 font-mono tracking-tighter opacity-50">
							{albumId}
						</p>
					</div>
					<div className="flex items-center gap-4 group">
						<Heading level={1} className="text-5xl md:text-6xl">
							{albumData?.data?.albumName}
						</Heading>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={openEditModal}
								className="p-2 text-zinc-400 hover:text-sage transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
								title="Edit Album"
							>
								<Edit2 size={20} />
							</button>
							<button
								type="button"
								onClick={() => setConfirmDeleteAlbum(true)}
								className="p-2 text-zinc-400 hover:text-plum transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
								title="Delete Album"
							>
								<Trash2 size={20} />
							</button>
						</div>
					</div>
					<p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-2xl">
						{images.length} photos curated in this collection. Organize, share, and rediscover your memories.
					</p>
				</div>
				
				<div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
					{/* View Toggle */}
					<div className="bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center shadow-inner">
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-xl transition-all ${viewMode === "grid"
								? "bg-white dark:bg-zinc-800 text-sage shadow-sm"
								: "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => setViewMode("list")}
							className={`p-2 rounded-xl transition-all ${viewMode === "list"
								? "bg-white dark:bg-zinc-800 text-sage shadow-sm"
								: "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M3 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h14a1 1 0 110 2H4a1 1 0 01-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</button>
					</div>

					<Button
						variant="outline"
						onClick={handleTriggerClustering}
						className="flex-1 md:flex-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
						Group Faces
					</Button>

					<Button
						variant="outline"
						onClick={() => setIsShareModalOpen(true)}
						className="flex-1 md:flex-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-4 w-4 mr-2"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
							/>
						</svg>
						Share
					</Button>
					
					<Button
						variant="primary"
						onClick={() => setIsUploadModalOpen(true)}
						className="flex-1 md:flex-none"
					>
						Upload Photos
					</Button>
				</div>
			</div>

			{isImagesDataLoading && isAlbumDataLoading ? (
				<div className="flex justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
				</div>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full auto-rows-[150px] md:auto-rows-[250px] grid-flow-dense">
					{images.map((image: any, index: number) => {
						const width = image.originalSize?.width || 0;
						const height = image.originalSize?.height || 0;

						const area = width * height;
						const isFeatured = area > 2000000;

						const spanClass = getBentoSpanClass(
							width,
							height,
							index,
							isFeatured,
						);

						return (
							<div key={image.imageId} className={`relative ${spanClass} animate-in fade-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${index * 50}ms` }}>
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
									className="cursor-pointer rounded-3xl transition-all duration-500 hover:scale-[1.02] shadow-sm w-full h-full object-cover"
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
			<div ref={ref} className="w-full flex justify-center py-12">
				{isFetchingNextPage && (
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
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

			<ConfirmModal
				isOpen={confirmDeleteAlbum}
				title="Delete Album"
				message="Are you sure you want to delete this album? All photo associations will be removed."
				confirmText="Delete Album"
				onConfirm={handleDeleteAlbum}
				onCancel={() => setConfirmDeleteAlbum(false)}
				isDestructive={true}
				isLoading={deleteAlbumMutation.isPending}
			/>

			{isEditModalOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
						<Heading level={2} className="mb-2">Edit Album</Heading>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
							Update the name of your album.
						</p>
						<input
							type="text"
							className="w-full px-6 py-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-sage focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
							placeholder="e.g. Summer Vacation 2025"
							value={editAlbumName}
							onChange={(e) => setEditAlbumName(e.target.value)}
							autoFocus
						/>
						<div className="flex items-center space-x-3 mt-10">
							<Button
								className="flex-1"
								onClick={handleEditAlbum}
								disabled={editAlbumMutation.isPending || !editAlbumName.trim()}
							>
								{editAlbumMutation.isPending ? "Saving..." : "Save Changes"}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setIsEditModalOpen(false);
									setEditAlbumName("");
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}

			{isUploadModalOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
						<Heading level={2} className="mb-2">
							Upload Photos
						</Heading>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-10">
							Select high-quality images to add to your album.
						</p>

						<div className="relative group mb-10">
							<input
								type="file"
								multiple
								onChange={handleFileChange}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
							/>
							<div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center transition-all group-hover:border-sage group-hover:bg-sage/5">
								<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-300 group-hover:text-sage mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								<p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
									{files ? `${files.length} files selected` : "Drop photos or click to browse"}
								</p>
							</div>
						</div>

						{uploadImagesMutation.isError && (
							<div className="mb-8 p-4 bg-plum/10 border border-plum/20 text-plum rounded-2xl text-sm">
								{(uploadImagesMutation.error as any).response?.data?.message ||
									uploadImagesMutation.error.message ||
									"Failed to upload images"}
							</div>
						)}

						<div className="flex items-center space-x-3">
							<Button
								className="flex-1"
								onClick={handleUpload}
								disabled={uploadImagesMutation.isPending || !files}
							>
								{uploadImagesMutation.isPending ? "Uploading..." : "Start Upload"}
							</Button>
							<Button
								variant="ghost"
								onClick={() => setIsUploadModalOpen(false)}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}
		</MainContainer>
	);
};

export default AlbumPage;
