import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { editAlbum } from "../utils/api";
import { Heading } from "./standard/Heading";
import { Button } from "./standard/Button";

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
		<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
			<div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
				<div className="flex justify-between items-start mb-6">
					<div>
						<Heading level={2}>Share Album</Heading>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
							Allow others to view this collection.
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-5 w-5"
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

				<div className="space-y-8 mt-10">
					<div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl">
						<div>
							<p className="font-bold text-zinc-900 dark:text-white">
								Public Link
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
								{shareToken ? "Currently active" : "Currently private"}
							</p>
						</div>
						<button
							onClick={handleToggleShare}
							disabled={shareMutation.isPending}
							className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ${
								shareToken ? "bg-sage shadow-lg shadow-sage/20" : "bg-zinc-200 dark:bg-zinc-800"
							}`}
						>
							<span
								className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
									shareToken ? "translate-x-6 shadow-sm" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{shareToken && (
						<div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
							<p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
								Direct Access URL
							</p>
							<div className="flex gap-2">
								<input
									readOnly
									value={shareUrl}
									className="flex-1 px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none font-mono truncate"
								/>
								<Button
									size="sm"
									onClick={copyToClipboard}
									className={copied ? "bg-emerald-500 text-white" : ""}
								>
									{copied ? "Copied" : "Copy"}
								</Button>
							</div>
						</div>
					)}
				</div>

				<div className="mt-12">
					<Button
						variant="secondary"
						onClick={onClose}
						className="w-full"
					>
						Done
					</Button>
				</div>
			</div>
		</div>
	);
};
