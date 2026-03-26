import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { AlbumCard } from "~/components/AlbumCard";
import { ConfirmModal } from "~/components/ConfirmModal";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Heading } from "~/components/standard/Heading";
import ImagesList from "~/Images/ImageGallery";
import { createAlbum, deleteAlbum, editAlbum, fetchAlbums } from "../utils/api";

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
		<MainContainer className="space-y-20">
			{/* Albums Section */}
			<section>
				<div className="flex justify-between items-end mb-10">
					<div>
						<Heading level={1}>Albums</Heading>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
							Organize your photos into meaningful collections
						</p>
					</div>
					<Button
						variant="outline"
						onClick={() => setIsCreateModalOpen(true)}
					>
						Create New Album
					</Button>
				</div>

				{isAlbumsLoading ? (
					<div className="flex justify-center py-20">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
						{albumsData?.data?.albums?.map((album: any) => (
							<AlbumCard
								key={album.id}
								album={album}
								onEdit={(albumToEdit) => {
									setSelectedAlbum(albumToEdit);
									setAlbumName(albumToEdit.albumName || "");
									setIsEditModalOpen(true);
								}}
								onDelete={(albumId) => {
									setConfirmDeleteAlbumId(albumId);
								}}
							/>
						))}
					</div>
				)}
			</section>

			{/* Recent Photos Section */}
			<section>
				<div className="mb-10">
					<Heading level={2}>Recent Photos</Heading>
					<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
						Your latest memories across all albums
					</p>
				</div>
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

			{(isCreateModalOpen || isEditModalOpen) && (
				<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
					<div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
						<Heading level={2} className="mb-2">
							{isCreateModalOpen ? "Create Album" : "Edit Album"}
						</Heading>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
							{isCreateModalOpen 
								? "Give your new album a name to start organizing."
								: "Update the name of your album."}
						</p>
						<input
							type="text"
							className="w-full px-6 py-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-sage focus:border-transparent outline-none transition-all placeholder:text-zinc-400"
							placeholder="e.g. Summer Vacation 2025"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
							autoFocus
						/>
						<div className="flex items-center space-x-3 mt-10">
							<Button
								className="flex-1"
								onClick={isCreateModalOpen ? handleCreateAlbum : handleEditAlbum}
								disabled={(isCreateModalOpen ? createAlbumMutation.isPending : editAlbumMutation.isPending) || !albumName.trim()}
							>
								{isCreateModalOpen 
									? (createAlbumMutation.isPending ? "Creating..." : "Create Album")
									: (editAlbumMutation.isPending ? "Saving..." : "Save Changes")}
							</Button>
							<Button
								variant="ghost"
								onClick={() => {
									setIsCreateModalOpen(false);
									setIsEditModalOpen(false);
									setAlbumName("");
									setSelectedAlbum(null);
								}}
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

export default Home;
