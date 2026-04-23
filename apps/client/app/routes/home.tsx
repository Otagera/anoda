import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HardDrive, QrCode, Search, Sparkles, Users, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { AlbumCard } from "~/components/AlbumCard";
import { ConfirmModal } from "~/components/ConfirmModal";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Heading } from "~/components/standard/Heading";
import ImagesList from "~/Images/ImageGallery";
import type { Album } from "~/types";
import {
	createAlbum,
	deleteAlbum,
	editAlbum,
	fetchAlbums,
	fetchSettings,
} from "../utils/api";

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
	const [showFirstTimeGuide, setShowFirstTimeGuide] = useState(false);

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

	useEffect(() => {
		const shouldShowGuide =
			localStorage.getItem("lumina:first-signup-guide") === "show";
		if (shouldShowGuide) {
			setShowFirstTimeGuide(true);
			localStorage.removeItem("lumina:first-signup-guide");
		}
	}, []);

	return (
		<MainContainer className="space-y-20 pb-20">
			{/* Albums Section */}
			<section>
				<div className="flex justify-between items-end mb-6">
					<div>
						<Heading level={1} className="text-4xl font-black">
							Albums
						</Heading>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
							Organize your photos and collaborative events
						</p>
					</div>
					<Button onClick={() => setIsCreateModalOpen(true)}>
						Create New Album
					</Button>
				</div>

				{isAlbumsLoading ? (
					<div className="flex justify-center py-20">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage" />
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
						{albumsData?.data?.albums?.map((album: Album) => (
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
					<Heading level={2} className="text-2xl font-bold">
						Recent Photos
					</Heading>
					<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
						Your latest memories across all albums
					</p>
				</div>
				<ImagesList />
			</section>

			{/* Plans Section */}
			<section className="pt-20 border-t border-zinc-100 dark:border-zinc-800">
				<div className="text-center mb-16">
					<span className="text-xs font-black uppercase tracking-widest text-plum mb-3 block">
						Tiers
					</span>
					<Heading level={2} className="text-4xl font-black mb-4">
						Plans & Limits
					</Heading>
					<p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
						Choose the plan that fits your storage and processing needs.
					</p>
				</div>

				<div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
					{/* Free Plan */}
					<div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] p-10 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:border-sage/30 transition-all duration-500">
						<div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
							<Zap size={80} className="text-sage" />
						</div>
						<h3 className="text-2xl font-black text-zinc-900 dark:text-white mb-2">
							Free Tier
						</h3>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8 font-medium">
							Great for personal use and small events.
						</p>
						<div className="space-y-4 mb-10">
							{[
								{ label: "Storage", value: "5 GB" },
								{ label: "AI Processing", value: "100 Images / mo" },
								{ label: "Collaborative Albums", value: "Unlimited" },
								{ label: "Face Search", value: "Included" },
							].map((feature) => (
								<div
									key={feature.label}
									className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-800/50 last:border-0"
								>
									<span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
										{feature.label}
									</span>
									<span className="text-sm text-zinc-900 dark:text-zinc-100 font-bold">
										{feature.value}
									</span>
								</div>
							))}
						</div>
						<div className="text-center">
							<span className="text-xs font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-full">
								Current Plan
							</span>
						</div>
					</div>

					{/* Pro Plan */}
					<div className="bg-gradient-to-br from-plum to-plum/80 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-plum/20 relative overflow-hidden group">
						<div className="absolute top-0 right-0 p-8 opacity-20 group-hover:rotate-12 transition-transform duration-500">
							<Sparkles size={80} />
						</div>
						<div className="inline-flex bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
							Most Popular
						</div>
						<h3 className="text-2xl font-black mb-2">Pro Tier</h3>
						<p className="text-white/70 text-sm mb-8 font-medium">
							For professional photographers and large events.
						</p>
						<div className="space-y-4 mb-10">
							{[
								{ label: "Storage", value: "50 GB" },
								{ label: "AI Processing", value: "Unlimited" },
								{ label: "Custom Storage (R2/S3)", value: "Included" },
								{ label: "Priority Support", value: "Included" },
							].map((feature) => (
								<div
									key={feature.label}
									className="flex justify-between items-center py-3 border-b border-white/10 last:border-0"
								>
									<span className="text-sm text-white/70 font-medium">
										{feature.label}
									</span>
									<span className="text-sm font-bold">{feature.value}</span>
								</div>
							))}
						</div>
						<Button
							variant="outline"
							className="w-full bg-white text-plum border-white hover:bg-zinc-100 font-black uppercase tracking-widest text-xs py-6 rounded-2xl"
							onClick={() => toast.success("Contact support to upgrade to Pro")}
						>
							Upgrade to Pro
						</Button>
					</div>
				</div>
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
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 font-medium">
							{isCreateModalOpen
								? "Give your new album a name to start organizing."
								: "Update the name of your album."}
						</p>
						<input
							type="text"
							className="w-full px-6 py-4 rounded-2xl border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-sage focus:border-transparent outline-none transition-all placeholder:text-zinc-400 font-medium"
							placeholder="e.g. Summer Vacation 2025"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
							autoFocus
						/>
						<div className="flex items-center space-x-3 mt-10">
							<Button
								className="flex-1 font-bold"
								onClick={
									isCreateModalOpen ? handleCreateAlbum : handleEditAlbum
								}
								disabled={
									(isCreateModalOpen
										? createAlbumMutation.isPending
										: editAlbumMutation.isPending) || !albumName.trim()
								}
							>
								{isCreateModalOpen
									? createAlbumMutation.isPending
										? "Creating..."
										: "Create Album"
									: editAlbumMutation.isPending
										? "Saving..."
										: "Save Changes"}
							</Button>
							<Button
								variant="ghost"
								className="rounded-xl font-bold"
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

			{showFirstTimeGuide && (
				<div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-md">
					<div className="w-full max-w-2xl rounded-[3rem] border border-zinc-200 bg-white p-10 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:p-12">
						<div className="mb-10 text-center">
							<div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/10 text-sage mb-4">
								<Sparkles size={24} />
							</div>
							<Heading level={2} className="text-3xl font-black mb-2">
								Welcome to the Intelligence Layer
							</Heading>
							<p className="text-zinc-500 dark:text-zinc-400 font-medium">
								Lumina is ready. Here's how to get the most value.
							</p>
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							{[
								{
									icon: <Users className="h-5 w-5 text-sage" />,
									title: "Create Events",
									description:
										"Turn any album into a collaborative event in settings.",
								},
								{
									icon: <QrCode className="h-5 w-5 text-sage" />,
									title: "Share QR Codes",
									description:
										"Let guests upload photos directly without an account.",
								},
								{
									icon: <HardDrive className="h-5 w-5 text-plum" />,
									title: "Own Your Storage",
									description: "Add your own S3/R2 bucket anytime in Settings.",
								},
								{
									icon: <Search className="h-5 w-5 text-terracotta" />,
									title: "AI Face Search",
									description:
										"Instantly find matching faces across guest uploads.",
								},
							].map((item) => (
								<div
									key={item.title}
									className="rounded-[2rem] border border-zinc-100 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-950/50 transition-all hover:border-sage/30 group"
								>
									<div className="mb-3">{item.icon}</div>
									<p className="font-bold text-zinc-900 dark:text-white group-hover:text-sage transition-colors">
										{item.title}
									</p>
									<p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
										{item.description}
									</p>
								</div>
							))}
						</div>

						<div className="mt-10 flex justify-center">
							<Button
								onClick={() => setShowFirstTimeGuide(false)}
								className="rounded-2xl px-12 py-6 font-black uppercase tracking-widest text-xs shadow-xl shadow-sage/20"
							>
								Start Organizing
							</Button>
						</div>
					</div>
				</div>
			)}
		</MainContainer>
	);
};

export default Home;
