import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { ConfirmModal } from "~/components/ConfirmModal";
import { MainContainer } from "~/components/MainContainer";
import ImagesList from "~/Images/ImageGallery";
import { createAlbum, deleteAlbum, editAlbum, fetchAlbums } from "../utils/api";

const AlbumCover = ({ album }: { album: any }) => {
	const coverImages = album.coverImages || [];

	if (coverImages.length >= 4) {
		return (
			<div className="grid grid-cols-2 grid-rows-2 w-full h-full">
				{coverImages.slice(0, 4).map((src: string, i: number) => (
					<img
						key={src}
						src={src}
						alt={`${album.albumName} cover ${i + 1}`}
						className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
					/>
				))}
			</div>
		);
	}

	if (coverImages.length > 0) {
		return (
			<img
				src={coverImages[0]}
				alt={album.albumName}
				className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
			/>
		);
	}

	// Fallback stylized text for empty albums
	const firstLetter = album.albumName
		? album.albumName.charAt(0).toUpperCase()
		: "?";
	return (
		<div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-6xl group-hover:scale-105 transition-transform duration-500">
			{firstLetter}
		</div>
	);
};

const Home = () => {
	const queryClient = useQueryClient();
	const { data: albumsData, isLoading: isAlbumsLoading } = useQuery({
		queryKey: ["albums"],
		queryFn: fetchAlbums,
	});
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [albumName, setAlbumName] = useState("");
	const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

	// Confirmation Modal States
	const [confirmDeleteAlbumId, setConfirmDeleteAlbumId] = useState<
		string | null
	>(null);

	const createAlbumMutation = useMutation({
		mutationFn: createAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
			setIsCreateModalOpen(false);
			setAlbumName("");
			toast.success("Album created successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to create album");
		},
	});

	const editAlbumMutation = useMutation({
		mutationFn: editAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
			setIsEditModalOpen(false);
			setAlbumName("");
			setSelectedAlbum(null);
			toast.success("Album updated");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update album");
		},
	});

	const deleteAlbumMutation = useMutation({
		mutationFn: deleteAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
			toast.success("Album deleted");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to delete album");
		},
	});

	const handleCreateAlbum = () => {
		if (!albumName.trim()) return;
		createAlbumMutation.mutate(albumName);
	};

	const handleEditAlbum = () => {
		if (!albumName.trim() || !selectedAlbum) return;
		editAlbumMutation.mutate({ albumId: selectedAlbum.id, albumName });
	};

	const handleDeleteAlbum = (albumId: string) => {
		deleteAlbumMutation.mutate(albumId);
		setConfirmDeleteAlbumId(null);
	};

	return (
		<MainContainer className="space-y-10">
			{/* Albums Section */}
			<section>
				<div className="flex justify-between items-center mb-5">
					<h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">
						Albums
					</h1>
					<button
						type="button"
						className="px-5 py-2.5 text-white bg-indigo-600 rounded-full hover:bg-indigo-500 transition-all font-semibold shadow-lg shadow-indigo-500/25 active:scale-95 text-sm"
						onClick={() => setIsCreateModalOpen(true)}
					>
						New Album
					</button>
				</div>

				{isAlbumsLoading ? (
					<div className="flex justify-center py-12">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
						{albumsData?.data?.albums?.map((album: any) => (
							<div
								key={album.id}
								className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-lg hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-300"
							>
								<Link to={`/album/${album.id}`} className="block">
									<div className="aspect-square bg-zinc-100 dark:bg-zinc-950 overflow-hidden relative">
										<AlbumCover album={album} />
										<div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
									</div>
									<div className="p-3.5">
										<h2 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-100 transition-colors truncate">
											{album.albumName}
										</h2>
										<p className="text-xs text-zinc-500 mt-1">
											Open album
										</p>
									</div>
								</Link>

								{/* Album Actions Overlay */}
								<div className="absolute top-2.5 right-2.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
									<button
										type="button"
										className="p-2 bg-white/95 dark:bg-zinc-800/90 backdrop-blur-md text-zinc-600 dark:text-zinc-300 rounded-lg hover:text-indigo-500 transition-colors shadow border border-zinc-200 dark:border-zinc-700"
										onClick={() => {
											setSelectedAlbum(album);
											setAlbumName(album.albumName);
											setIsEditModalOpen(true);
										}}
										title="Edit Album"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											role="img"
											aria-label="Edit Album icon"
										>
											<title>Edit Album</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
									</button>
									<button
										type="button"
										className="p-2 bg-white/95 dark:bg-zinc-800/90 backdrop-blur-md text-zinc-600 dark:text-zinc-300 rounded-lg hover:text-red-500 transition-colors shadow border border-zinc-200 dark:border-zinc-700"
										onClick={() => setConfirmDeleteAlbumId(album.id)}
										title="Delete Album"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											role="img"
											aria-label="Delete Album icon"
										>
											<title>Delete Album</title>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
											/>
										</svg>
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* All Photos Section */}
			<section className="pt-6 border-t border-zinc-100 dark:border-zinc-800">
				<ImagesList />
			</section>

			{/* Modals */}
			<ConfirmModal
				isOpen={!!confirmDeleteAlbumId}
				title="Delete Album"
				message="Are you sure you want to delete this album? All photo associations will be removed. The actual photos will remain in your library."
				confirmText="Delete Album"
				onConfirm={() =>
					confirmDeleteAlbumId && handleDeleteAlbum(confirmDeleteAlbumId)
				}
				onCancel={() => setConfirmDeleteAlbumId(null)}
				isDestructive={true}
				isLoading={deleteAlbumMutation.isPending}
			/>

			{isCreateModalOpen && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800">
						<h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
							Create Album
						</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
							Give your new album a name to start organizing.
						</p>
						<input
							type="text"
							className="w-full px-5 py-3 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
							placeholder="e.g. Summer Vacation 2025"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex items-center space-x-3 mt-8">
							<button
								type="button"
								className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95"
								onClick={handleCreateAlbum}
								disabled={createAlbumMutation.isPending || !albumName.trim()}
							>
								{createAlbumMutation.isPending ? "Creating..." : "Create Album"}
							</button>
							<button
								type="button"
								className="px-6 py-3 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
								onClick={() => setIsCreateModalOpen(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}

			{isEditModalOpen && (
				<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800">
						<h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
							Edit Album
						</h2>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
							Update the name of your album.
						</p>
						<input
							type="text"
							className="w-full px-5 py-3 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
							placeholder="Album Name"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex items-center space-x-3 mt-8">
							<button
								type="button"
								className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95"
								onClick={handleEditAlbum}
								disabled={editAlbumMutation.isPending || !albumName.trim()}
							>
								{editAlbumMutation.isPending ? "Saving..." : "Save Changes"}
							</button>
							<button
								type="button"
								className="px-6 py-3 text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 rounded-2xl font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
								onClick={() => {
									setIsEditModalOpen(false);
									setAlbumName("");
									setSelectedAlbum(null);
								}}
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

export default Home;
