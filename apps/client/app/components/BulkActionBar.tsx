import type React from "react";
import { useState } from "react";
import { ConfirmModal } from "./ConfirmModal";

interface BulkActionBarProps {
	selectedCount: number;
	onClear: () => void;
	onDelete?: () => void;
	onAddToAlbum?: () => void;
	onDownload?: () => void;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
	selectedCount,
	onClear,
	onDelete,
	onAddToAlbum,
	onDownload,
}) => {
	const [isConfirmOpen, setIsConfirmOpen] = useState(false);

	if (selectedCount === 0) return null;

	return (
		<>
			<div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-bottom-4 duration-300 w-max max-w-[90vw]">
				<div className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800 px-4 sm:px-6 py-4 rounded-3xl shadow-2xl flex items-center space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar">
					<div className="flex items-center space-x-3 pr-4 sm:pr-6 border-r border-zinc-800">
						<button
							type="button"
							onClick={onClear}
							className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
							title="Clear selection"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								role="img"
								aria-label="Clear selection"
							>
								<title>Clear selection</title>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
						<span className="text-zinc-100 font-bold whitespace-nowrap text-sm sm:text-base">
							{selectedCount} selected
						</span>
					</div>

					<div className="flex items-center space-x-2 sm:space-x-3">
						{onDownload && (
							<button
								type="button"
								onClick={onDownload}
								className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all flex items-center space-x-2 text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-500/20 active:scale-95 whitespace-nowrap"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									role="img"
									aria-label="Download"
								>
									<title>Download</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
									/>
								</svg>
								<span>Download</span>
							</button>
						)}

						{onAddToAlbum && (
							<button
								type="button"
								onClick={onAddToAlbum}
								className="px-3 sm:px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl transition-all flex items-center space-x-2 text-xs sm:text-sm font-semibold border border-zinc-700 active:scale-95 whitespace-nowrap"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									role="img"
									aria-label="Add to Album"
								>
									<title>Add to Album</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
								<span>Add to Album</span>
							</button>
						)}

						{onDelete && (
							<button
								type="button"
								onClick={() => setIsConfirmOpen(true)}
								className="px-3 sm:px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all flex items-center space-x-2 text-xs sm:text-sm font-semibold border border-red-500/20 active:scale-95 whitespace-nowrap"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									role="img"
									aria-label="Delete"
								>
									<title>Delete</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
								<span>Delete</span>
							</button>
						)}
					</div>
				</div>
			</div>

			{onDelete && (
				<ConfirmModal
					isOpen={isConfirmOpen}
					title="Delete Selected Photos"
					message={`Are you sure you want to permanently delete these ${selectedCount} photos? This action cannot be undone.`}
					confirmText={`Delete ${selectedCount} Items`}
					onConfirm={() => {
						onDelete();
						setIsConfirmOpen(false);
					}}
					onCancel={() => setIsConfirmOpen(false)}
					isDestructive={true}
				/>
			)}
		</>
	);
};
