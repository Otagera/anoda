import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Heading } from "~/components/standard/Heading";
import { fetchTrash, restoreAlbum, restoreImages } from "~/utils/api";

const Trash = () => {
	const queryClient = useQueryClient();
	const [selectedImages, setSelectedImages] = useState<string[]>([]);
	const [selectedAlbums, setSelectedAlbums] = useState<string[]>([]);

	const { data, isLoading } = useQuery({
		queryKey: ["trash"],
		queryFn: fetchTrash,
	});

	const restoreImagesMutation = useMutation({
		mutationFn: restoreImages,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["trash"] });
			setSelectedImages([]);
			toast.success("Images restored");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to restore images");
		},
	});

	const restoreAlbumMutation = useMutation({
		mutationFn: restoreAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["trash"] });
			setSelectedAlbums([]);
			toast.success("Album restored");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to restore album");
		},
	});

	const handleRestoreImages = () => {
		if (selectedImages.length === 0) return;
		restoreImagesMutation.mutate(selectedImages);
	};

	const handleRestoreAlbum = (albumId: string) => {
		restoreAlbumMutation.mutate(albumId);
	};

	const toggleImage = (id: string) => {
		setSelectedImages((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const toggleAlbum = (id: string) => {
		setSelectedAlbums((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const albums = data?.data?.albums || [];
	const images = data?.data?.images || [];

	const formatDate = (dateStr: string | null) => {
		if (!dateStr) return "Unknown";
		return new Date(dateStr).toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	if (isLoading) {
		return (
			<MainContainer>
				<div className="flex justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
				</div>
			</MainContainer>
		);
	}

	return (
		<MainContainer className="space-y-12 pb-20">
			<div>
				<Heading level={1} className="text-4xl font-black">
					Trash
				</Heading>
				<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
					Items will be permanently deleted after 30 days
				</p>
			</div>

			{albums.length === 0 && images.length === 0 ? (
				<div className="text-center py-20">
					<Trash2 className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600 mb-4" />
					<p className="text-zinc-500 dark:text-zinc-400">Trash is empty</p>
				</div>
			) : (
				<>
					{albums.length > 0 && (
						<section>
							<div className="flex items-center justify-between mb-6">
								<Heading level={2} className="text-xl font-bold">
									Deleted Albums ({albums.length})
								</Heading>
							</div>
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
								{albums.map((album: any) => (
									<div
										key={album.id}
										onClick={() => toggleAlbum(album.id)}
										className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
											selectedAlbums.includes(album.id)
												? "border-sage bg-sage/10"
												: "border-zinc-200 dark:border-zinc-800 hover:border-sage/50"
										}`}
									>
										<div className="flex items-center justify-between">
											<div className="flex-1 min-w-0">
												<p className="font-bold text-zinc-900 dark:text-white truncate">
													{album.name}
												</p>
												<p className="text-xs text-zinc-500 mt-1">
													Deleted {formatDate(album.deletedAt)}
												</p>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={(e) => {
													e.stopPropagation();
													handleRestoreAlbum(album.id);
												}}
												disabled={restoreAlbumMutation.isPending}
											>
												<RotateCcw size={16} />
											</Button>
										</div>
									</div>
								))}
							</div>
						</section>
					)}

					{images.length > 0 && (
						<section>
							<div className="flex items-center justify-between mb-6">
								<Heading level={2} className="text-xl font-bold">
									Deleted Images ({images.length})
								</Heading>
								{selectedImages.length > 0 && (
									<Button
										onClick={handleRestoreImages}
										disabled={restoreImagesMutation.isPending}
									>
										<RotateCcw size={16} className="mr-2" />
										Restore Selected ({selectedImages.length})
									</Button>
								)}
							</div>
							<div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
								{images.map((img: any) => (
									<div
										key={img.id}
										onClick={() => toggleImage(img.id)}
										className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
											selectedImages.includes(img.id)
												? "border-sage ring-2 ring-sage/30"
												: "border-transparent hover:border-sage/50"
										}`}
									>
										<img
											src={img.path}
											alt="Deleted"
											className="w-full h-full object-cover opacity-60"
										/>
										<div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
											<p className="text-xs text-white truncate">
												{formatDate(img.deletedAt)}
											</p>
										</div>
										{selectedImages.includes(img.id) && (
											<div className="absolute top-2 right-2 w-6 h-6 bg-sage rounded-full flex items-center justify-center">
												<span className="text-white text-xs">✓</span>
											</div>
										)}
									</div>
								))}
							</div>
						</section>
					)}
				</>
			)}
		</MainContainer>
	);
};

export default Trash;
