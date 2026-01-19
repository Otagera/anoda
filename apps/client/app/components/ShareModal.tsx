import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editAlbum } from "../utils/api";

interface ShareModalProps {
	albumId: string;
	albumName: string;
	shareToken: string | null;
	onClose: () => void;
}

export const ShareModal = ({
	albumId,
	albumName,
	shareToken,
	onClose,
}: ShareModalProps) => {
	const queryClient = useQueryClient();
	const [copied, setCopied] = useState(false);

	const shareMutation = useMutation({
		mutationFn: (token: string | null) =>
			editAlbum({ albumId, shareToken: token }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [`album-${albumId}`] });
		},
	});

	const handleToggleShare = () => {
		if (shareToken) {
			shareMutation.mutate(null);
		} else {
			// Generate a simple random token
			const newToken =
				Math.random().toString(36).substring(2, 15) +
				Math.random().toString(36).substring(2, 15);
			shareMutation.mutate(newToken);
		}
	};

	const shareUrl = `${window.location.origin}/share/${shareToken}`;

	const copyToClipboard = () => {
		navigator.clipboard.writeText(shareUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-700">
				<div className="flex justify-between items-center mb-6">
					<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
						Share Album
					</h2>
					<button
						onClick={onClose}
						className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<p className="text-gray-600 dark:text-gray-400 mb-8">
					Share "{albumName}" with others. Anyone with the link can view photos
					and search faces within this album.
				</p>

				<div className="space-y-6">
					<div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
						<div>
							<p className="font-semibold text-gray-900 dark:text-white">
								Public Sharing
							</p>
							<p className="text-sm text-gray-500 dark:text-gray-400">
								{shareToken ? "Currently enabled" : "Currently disabled"}
							</p>
						</div>
						<button
							onClick={handleToggleShare}
							disabled={shareMutation.isPending}
							className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
								shareToken ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"
							}`}
						>
							<span
								className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
									shareToken ? "translate-x-6" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{shareToken && (
						<div className="space-y-3">
							<p className="text-sm font-medium text-gray-700 dark:text-gray-300">
								Shareable Link
							</p>
							<div className="flex space-x-2">
								<input
									readOnly
									value={shareUrl}
									className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 focus:outline-none"
								/>
								<button
									onClick={copyToClipboard}
									className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
										copied
											? "bg-green-600 text-white"
											: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
									}`}
								>
									{copied ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					)}
				</div>

				<div className="mt-8">
					<button
						onClick={onClose}
						className="w-full py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
					>
						Done
					</button>
				</div>
			</div>
		</div>
	);
};
