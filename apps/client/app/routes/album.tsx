import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { CheckCircle, Settings2, Trash2, Upload, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useInView } from "react-intersection-observer";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AddToAlbumModal } from "~/components/AddToAlbumModal";
import { AlbumSettingsModal } from "~/components/AlbumSettingsModal";
import { BackButton } from "~/components/BackButton";
import { BulkActionBar } from "~/components/BulkActionBar";
import { CompactListView } from "~/components/CompactListView";
import { ConfirmModal } from "~/components/ConfirmModal";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Heading } from "~/components/standard/Heading";
import { UsageIndicator } from "~/components/UsageIndicator";
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
	fetchSettings,
	moderateImages,
	uploadImages,
} from "../utils/api";
import axiosAPI from "../utils/axios";
import { useUpload } from "../utils/UploadContext";
import { useDownloadZip } from "~/hooks/useDownloadZip";

const AlbumPage = () => {
	const { albumId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { addUploads } = useUpload();
	const [searchParams, setSearchParams] = useSearchParams();
	const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
	const [isShareModalOpen, setIsShareModalOpen] = useState(false);
	const [isAlbumSettingsModalOpen, setIsAlbumSettingsModalOpen] =
		useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [confirmDeleteAlbum, setConfirmDeleteAlbum] = useState(false);
	const [editAlbumName, setEditAlbumName] = useState("");
	const [files, setFiles] = useState<FileList | null>(null);

	const [view, setView] = useState<"gallery" | "moderation">("gallery");
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
	const [isBatchProcessing, setIsBatchProcessing] = useState(false);

	const { downloadZip } = useDownloadZip();

	const {
		data: imagesData,
		isLoading: isImagesDataLoading,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useInfiniteQuery({
		queryKey: ["images", albumId, "APPROVED"],
		queryFn: ({ pageParam }) =>
			fetchImagesInAlbum({ albumId: albumId!, pageParam, status: "APPROVED" }),
		enabled: !!albumId && view === "gallery",
		getNextPageParam: (lastPage) =>
			lastPage?.data?.pagination?.nextCursor || null,
		initialPageParam: null as string | null,
	});

	const {
		data: pendingImagesData,
		isLoading: isPendingImagesLoading,
		fetchNextPage: fetchNextPendingPage,
		hasNextPage: hasNextPendingPage,
		isFetchingNextPage: isFetchingNextPendingPage,
	} = useInfiniteQuery({
		queryKey: ["images", albumId, "PENDING"],
		queryFn: ({ pageParam }) =>
			fetchImagesInAlbum({ albumId: albumId!, pageParam, status: "PENDING" }),
		enabled: !!albumId && view === "moderation",
		getNextPageParam: (lastPage) =>
			lastPage?.data?.pagination?.nextCursor || null,
		initialPageParam: null as string | null,
	});

	const { ref, inView } = useInView({
		rootMargin: "200px",
	});

	useEffect(() => {
		if (inView) {
			if (view === "gallery" && hasNextPage && !isFetchingNextPage) {
				fetchNextPage();
			} else if (
				view === "moderation" &&
				hasNextPendingPage &&
				!isFetchingNextPendingPage
			) {
				fetchNextPendingPage();
			}
		}
	}, [
		inView,
		view,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		hasNextPendingPage,
		isFetchingNextPendingPage,
		fetchNextPendingPage,
	]);

	const { data: albumData, isLoading: isAlbumDataLoading } = useQuery({
		queryKey: [`album-${albumId}`, albumId],
		queryFn: () => fetchAlbum(albumId!),
		enabled: !!albumId,
	});

	const { data: settingsData } = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
	});

	const usage = settingsData?.data?.usage;
	const imagesUsed = usage?.imagesUsed || 0;
	const imagesLimit = usage?.imagesLimit || 50;

	const images = useMemo(() => {
		const currentData = view === "gallery" ? imagesData : pendingImagesData;
		return (
			currentData?.pages.flatMap(
				(page) => page?.data?.imagesInAlbum?.map((ia: any) => ia.images) || [],
			) || []
		);
	}, [imagesData, pendingImagesData, view]);

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
			queryClient.invalidateQueries({
				queryKey: [`album-${albumId}`, albumId],
			});
			toast.success("Album updated");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update album");
		},
	});

	const moderateImagesMutation = useMutation({
		mutationFn: ({
			imageIds,
			status,
		}: {
			imageIds: string[];
			status: "APPROVED" | "REJECTED";
		}) => moderateImages(imageIds, status),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["images", albumId] });
			setSelectedIds(new Set());
			toast.success("Action completed successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to moderate images");
		},
	});

	const handleModerate = (status: "APPROVED" | "REJECTED") => {
		if (selectedIds.size === 0) return;
		moderateImagesMutation.mutate({
			imageIds: Array.from(selectedIds),
			status,
		});
	};

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
		await downloadZip(images, selectedIds, () => setSelectedIds(new Set()));
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
								onClick={() => setIsAlbumSettingsModalOpen(true)}
								className="p-2 text-zinc-400 hover:text-sage transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
								title="Album Settings"
							>
								<Settings2 size={20} />
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
						{images.length} photos curated in this collection. Organize, share,
						and rediscover your memories.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
					{/* Tab Toggle */}
					{albumData?.data?.settings?.is_event && (
						<div className="bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center shadow-inner mr-4">
							<button
								type="button"
								onClick={() => setView("gallery")}
								className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
									view === "gallery"
										? "bg-white dark:bg-zinc-800 text-sage shadow-sm"
										: "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
							>
								Gallery
							</button>
							<button
								type="button"
								onClick={() => setView("moderation")}
								className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
									view === "moderation"
										? "bg-white dark:bg-zinc-800 text-sage shadow-sm"
										: "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
								}`}
							>
								Moderation
							</button>
						</div>
					)}

					{/* View Toggle */}
					<div className="bg-zinc-100 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center shadow-inner">
						<button
							type="button"
							onClick={() => setViewMode("grid")}
							className={`p-2 rounded-xl transition-all ${
								viewMode === "grid"
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
							className={`p-2 rounded-xl transition-all ${
								viewMode === "list"
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

			{(isImagesDataLoading || isPendingImagesLoading) && isAlbumDataLoading ? (
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
							<div
								key={image.imageId}
								className={`relative ${spanClass} animate-in fade-in slide-in-from-bottom-4 duration-500`}
								style={{ animationDelay: `${index * 50}ms` }}
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
				{(isFetchingNextPage || isFetchingNextPendingPage) && (
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

			{/* Custom Bulk Bar for Moderation */}
			{view === "moderation" && selectedIds.size > 0 ? (
				<div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 duration-500">
					<div className="bg-zinc-900/90 dark:bg-white/90 backdrop-blur-xl px-8 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 dark:border-zinc-200">
						<div className="flex items-center gap-3">
							<span className="w-8 h-8 rounded-full bg-sage flex items-center justify-center text-white text-xs font-black">
								{selectedIds.size}
							</span>
							<span className="text-sm font-bold dark:text-zinc-900 text-white">
								Selected
							</span>
						</div>
						<div className="h-8 w-[1px] bg-white/10 dark:bg-zinc-200" />
						<div className="flex items-center gap-3">
							<Button
								size="sm"
								className="bg-green-500 hover:bg-green-600 text-white"
								onClick={() => handleModerate("APPROVED")}
								disabled={moderateImagesMutation.isPending}
							>
								<CheckCircle size={16} className="mr-2" /> Approve
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="text-red-500 hover:bg-red-500/10"
								onClick={() => handleModerate("REJECTED")}
								disabled={moderateImagesMutation.isPending}
							>
								<XCircle size={16} className="mr-2" /> Reject
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="dark:text-zinc-500 text-zinc-400"
								onClick={() => setSelectedIds(new Set())}
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			) : (
				<BulkActionBar
					selectedCount={selectedIds.size}
					onClear={() => setSelectedIds(new Set())}
					onDelete={handleBulkDelete}
					onAddToAlbum={() => setIsAddToAlbumOpen(true)}
					onDownload={handleBulkDownload}
				/>
			)}

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

			{isAlbumSettingsModalOpen && albumData?.data && (
				<AlbumSettingsModal
					albumId={albumId!}
					albumName={albumData.data.albumName || ""}
					settings={albumData.data.settings}
					storageConfigId={albumData.data.storageConfigId}
					onClose={() => setIsAlbumSettingsModalOpen(false)}
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
			/>

			{isUploadModalOpen && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
						<div className="flex justify-between items-start mb-6">
							<div>
								<Heading level={2} className="mb-2">
									Upload Photos
								</Heading>
								<p className="text-sm text-zinc-500 dark:text-zinc-400">
									Add memories to your collection.
								</p>
							</div>
							<UsageIndicator />
						</div>

						<div className="mb-8 p-5 bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-zinc-100 dark:border-zinc-800/50">
							<div className="flex items-center justify-between text-sm mb-4">
								<span className="font-semibold text-zinc-500">
									Monthly Limit:
								</span>
								<span className="font-bold text-zinc-900 dark:text-white">
									{imagesLimit} images
								</span>
							</div>

							<div className="flex items-center justify-between text-sm mb-4">
								<span className="font-semibold text-zinc-500">
									Images Used:
								</span>
								<span className="font-bold text-zinc-900 dark:text-white">
									{imagesUsed}
								</span>
							</div>

							<div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />

							{files ? (
								<>
									<div className="flex items-center justify-between text-sm mb-2">
										<span className="font-semibold text-zinc-500">
											This upload:
										</span>
										<span className="font-black text-sage">
											+ {files.length} images
										</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<span className="font-semibold text-zinc-500">
											Remaining after:
										</span>
										<span
											className={`font-black ${
												imagesUsed + files.length > imagesLimit
													? "text-plum"
													: "text-sage"
											}`}
										>
											{Math.max(0, imagesLimit - (imagesUsed + files.length))}{" "}
											images
										</span>
									</div>
									{imagesUsed + files.length > imagesLimit && (
										<div className="mt-4 p-3 bg-plum/10 rounded-xl border border-plum/20">
											<p className="text-xs text-plum font-bold leading-relaxed">
												⚠️ You've reached your limit. Upgrade your plan to upload
												these {files.length} photos.
											</p>
										</div>
									)}
								</>
							) : (
								<div className="flex items-center justify-between text-sm">
									<span className="font-semibold text-zinc-500">
										Available to upload:
									</span>
									<span className="font-black text-sage">
										{imagesLimit - imagesUsed} images
									</span>
								</div>
							)}
						</div>
						<div className="relative group mb-10">
							<input
								type="file"
								multiple
								onChange={handleFileChange}
								className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
							/>
							<div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col items-center justify-center transition-all group-hover:border-sage group-hover:bg-sage/5">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-10 w-10 text-zinc-300 group-hover:text-sage mb-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
									{files
										? `${files.length} files selected`
										: "Drop photos or click to browse"}
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
								disabled={
									uploadImagesMutation.isPending ||
									!files ||
									(files && imagesUsed + files.length > imagesLimit)
								}
							>
								{uploadImagesMutation.isPending
									? "Uploading..."
									: files && imagesUsed + files.length > imagesLimit
										? "Limit Exceeded"
										: "Start Upload"}
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
