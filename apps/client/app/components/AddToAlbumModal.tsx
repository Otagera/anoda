import { useQuery } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { fetchAlbums } from "../utils/api";

interface AddToAlbumModalProps {
	onClose: () => void;
	onConfirm: (albumId: string) => void;
	isProcessing?: boolean;
}

interface Album {
	id: string;
	albumName: string;
}

export const AddToAlbumModal: React.FC<AddToAlbumModalProps> = ({
	onClose,
	onConfirm,
	isProcessing,
}) => {
	const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);

	const { data: albumsData, isLoading } = useQuery({
		queryKey: ["albums"],
		queryFn: fetchAlbums,
	});

	const albums: Album[] = albumsData?.data?.albums || [];

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
			<div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[80vh]">
				<div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
					<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
						Add to Album
					</h2>
					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5 text-zinc-500"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							role="img"
							aria-label="Close"
						>
							<title>Close</title>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div className="flex-1 overflow-y-auto p-4 space-y-2">
					{isLoading ? (
						<div className="flex justify-center py-8">
							<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500" />
						</div>
					) : albums.length === 0 ? (
						<p className="text-center py-8 text-zinc-500 text-sm">
							No albums found. Create one first.
						</p>
					) : (
						albums.map((album) => (
							<button
								type="button"
								key={album.id}
								onClick={() => setSelectedAlbumId(album.id)}
								className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
									selectedAlbumId === album.id
										? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400"
										: "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
								}`}
							>
								<div className="flex items-center space-x-3">
									<div className="w-10 h-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-5 w-5 text-zinc-400"
											viewBox="0 0 20 20"
											fill="currentColor"
											role="img"
											aria-label="Album"
										>
											<title>Album</title>
											<path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
										</svg>
									</div>
									<span className="font-bold text-sm">{album.albumName}</span>
								</div>
								{selectedAlbumId === album.id && (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-5 w-5"
										viewBox="0 0 20 20"
										fill="currentColor"
										role="img"
										aria-label="Selected"
									>
										<title>Selected</title>
										<path
											fillRule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clipRule="evenodd"
										/>
									</svg>
								)}
							</button>
						))
					)}
				</div>

				<div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex space-x-3">
					<button
						type="button"
						onClick={() => selectedAlbumId && onConfirm(selectedAlbumId)}
						disabled={!selectedAlbumId || isProcessing}
						className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 hover:bg-indigo-500 transition-all disabled:opacity-50 active:scale-95"
					>
						{isProcessing ? "Adding..." : "Add to Album"}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="px-6 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
};
