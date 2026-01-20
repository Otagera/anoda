import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { createAlbum, deleteAlbum, editAlbum, fetchAlbums } from "../utils/api";

const Home = () => {
	const queryClient = useQueryClient();
	const { data: albumsData, isLoading } = useQuery({
		queryKey: ["albums"],
		queryFn: fetchAlbums,
	});
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [albumName, setAlbumName] = useState("");
	const [selectedAlbum, setSelectedAlbum] = useState<any>(null);

	const createAlbumMutation = useMutation({
		mutationFn: createAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
			setIsCreateModalOpen(false);
			setAlbumName("");
		},
	});

	const editAlbumMutation = useMutation({
		mutationFn: editAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
			setIsEditModalOpen(false);
			setAlbumName("");
			setSelectedAlbum(null);
		},
	});

	const deleteAlbumMutation = useMutation({
		mutationFn: deleteAlbum,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["albums"] });
		},
	});

	const handleCreateAlbum = () => {
		createAlbumMutation.mutate(albumName);
	};

	const handleEditAlbum = () => {
		editAlbumMutation.mutate({ albumId: selectedAlbum.id, albumName });
	};

	const handleDeleteAlbum = (albumId: string) => {
		deleteAlbumMutation.mutate(albumId);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold text-black dark:text-white">
					My Albums
				</h1>
				<button
					className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
					onClick={() => setIsCreateModalOpen(true)}
				>
					Create New Album
				</button>
			</div>
			{isLoading ? (
				<div>Loading...</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
					{albumsData?.data?.albums?.map((album: any) => (
						<div key={album.id} className="block group">
							<Link to={`/album/${album.id}`}>
								<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
									<img
										src={"https://placehold.co/150"}
										alt={album.albumName}
										className="w-full h-48 object-cover"
									/>
									<div className="p-4">
										<h2 className="text-lg font-semibold text-black dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
											{album.albumName}
										</h2>
									</div>{" "}
								</div>
							</Link>
							<div className="flex justify-end mt-2">
								<button
									className="px-2 py-1 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
									onClick={() => {
										setSelectedAlbum(album);
										setAlbumName(album.albumName);
										setIsEditModalOpen(true);
									}}
								>
									Edit
								</button>
								<button
									className="px-2 py-1 text-white bg-red-600 rounded-md hover:bg-red-700"
									onClick={() => handleDeleteAlbum(album.id)}
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}
			{isCreateModalOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
						<h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
							Create New Album
						</h2>
						<input
							type="text"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
							placeholder="Album Name"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex justify-end mt-6">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
								onClick={handleCreateAlbum}
								disabled={createAlbumMutation.isPending}
							>
								{createAlbumMutation.isPending ? "Creating..." : "Create"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ml-3"
								onClick={() => setIsCreateModalOpen(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
			{isEditModalOpen && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
						<h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
							Edit Album
						</h2>
						<input
							type="text"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
							placeholder="Album Name"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex justify-end mt-6">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
								onClick={handleEditAlbum}
								disabled={editAlbumMutation.isPending}
							>
								{editAlbumMutation.isPending ? "Saving..." : "Save"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ml-3"
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
		</div>
	);
};

export default Home;
