import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAlbums, createAlbum, editAlbum, deleteAlbum } from "../utils/api";
import { useState } from "react";

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
		editAlbumMutation.mutate({ albumId: selectedAlbum.album_id, albumName });
	};

	const handleDeleteAlbum = (albumId: string) => {
		deleteAlbumMutation.mutate(albumId);
	};

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="flex justify-between items-center mb-8">
				<h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
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
								<div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
									<img
										src={"https://placehold.co/150"}
										alt={album.album_name}
										className="w-full h-48 object-cover"
									/>
									<div className="p-4">
										<h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 group-hover:text-blue-600">
											{album.album_name}
										</h2>
									</div>
								</div>
							</Link>
							<div className="flex justify-end mt-2">
								<button
									className="px-2 py-1 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
									onClick={() => {
										setSelectedAlbum(album);
										setAlbumName(album.album_name);
										setIsEditModalOpen(true);
									}}
								>
									Edit
								</button>
								<button
									className="px-2 py-1 text-white bg-red-600 rounded-md hover:bg-red-700"
									onClick={() => handleDeleteAlbum(album.album_id)}
								>
									Delete
								</button>
							</div>
						</div>
					))}
				</div>
			)}
			{isCreateModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white p-8 rounded-lg">
						<h2 className="text-2xl font-bold mb-4">Create New Album</h2>
						<input
							type="text"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
							placeholder="Album Name"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex justify-end mt-4">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
								onClick={handleCreateAlbum}
								disabled={createAlbumMutation.isPending}
							>
								{createAlbumMutation.isPending ? "Creating..." : "Create"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
								onClick={() => setIsCreateModalOpen(false)}
							>
								Cancel
							</button>
						</div>
					</div>
				</div>
			)}
			{isEditModalOpen && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
					<div className="bg-white p-8 rounded-lg">
						<h2 className="text-2xl font-bold mb-4">Edit Album</h2>
						<input
							type="text"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
							placeholder="Album Name"
							value={albumName}
							onChange={(e) => setAlbumName(e.target.value)}
						/>
						<div className="flex justify-end mt-4">
							<button
								className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 mr-2"
								onClick={handleEditAlbum}
								disabled={editAlbumMutation.isPending}
							>
								{editAlbumMutation.isPending ? "Saving..." : "Save"}
							</button>
							<button
								className="px-4 py-2 text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300"
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
