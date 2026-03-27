import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Link as LinkIcon, QrCode, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { editAlbum } from "../utils/api";
import { Button } from "./standard/Button";
import { Heading } from "./standard/Heading";

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
	const [showQR, setShowQR] = useState(false);

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

	const downloadQR = () => {
		const svg = document.getElementById("album-qr");
		if (!svg) return;
		const svgData = new XMLSerializer().serializeToString(svg);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		const img = new Image();
		img.onload = () => {
			canvas.width = img.width;
			canvas.height = img.height;
			ctx?.drawImage(img, 0, 0);
			const pngFile = canvas.toDataURL("image/png");
			const downloadLink = document.createElement("a");
			downloadLink.download = `qr-${albumName}.png`;
			downloadLink.href = pngFile;
			downloadLink.click();
		};
		img.src = "data:image/svg+xml;base64," + btoa(svgData);
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
			<div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
				<div className="flex justify-between items-start mb-2">
					<div>
						<Heading
							level={2}
							className="text-2xl font-black tracking-tight flex items-center gap-2"
						>
							<Share2 size={24} className="text-sage" /> Share Album
						</Heading>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
							Generate a public link for guests to view or contribute.
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

				<div className="space-y-6 mt-8">
					<div className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2rem]">
						<div>
							<p className="font-bold text-zinc-900 dark:text-white">
								Public Sharing
							</p>
							<p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
								{shareToken ? "Link is active" : "Currently private"}
							</p>
						</div>
						<button
							onClick={handleToggleShare}
							disabled={shareMutation.isPending}
							className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all focus:outline-none ${
								shareToken
									? "bg-sage shadow-lg shadow-sage/20"
									: "bg-zinc-200 dark:bg-zinc-800"
							}`}
						>
							<span
								className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${
									shareToken ? "translate-x-7 shadow-sm" : "translate-x-1"
								}`}
							/>
						</button>
					</div>

					{shareToken && (
						<div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
							<div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl">
								<button
									onClick={() => setShowQR(false)}
									className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!showQR ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"}`}
								>
									<LinkIcon size={14} /> Link
								</button>
								<button
									onClick={() => setShowQR(true)}
									className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showQR ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white" : "text-zinc-500"}`}
								>
									<QrCode size={14} /> QR Code
								</button>
							</div>

							{!showQR ? (
								<div className="space-y-3">
									<p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
										Direct Access URL
									</p>
									<div className="flex gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
										<input
											readOnly
											value={shareUrl}
											className="flex-1 px-3 bg-transparent text-xs text-zinc-600 dark:text-zinc-300 focus:outline-none font-mono truncate"
										/>
										<Button
											size="sm"
											onClick={copyToClipboard}
											className={`rounded-xl px-4 ${copied ? "bg-emerald-500 text-white" : ""}`}
										>
											{copied ? <Check size={16} /> : <Copy size={16} />}
										</Button>
									</div>
								</div>
							) : (
								<div className="flex flex-col items-center gap-6 py-4 animate-in zoom-in duration-300">
									<div className="p-6 bg-white rounded-3xl shadow-xl shadow-sage/5 border border-zinc-100">
										<QRCodeSVG
											id="album-qr"
											value={shareUrl}
											size={180}
											level="H"
											includeMargin={false}
											className="rounded-lg"
										/>
									</div>
									<Button
										variant="outline"
										size="sm"
										onClick={downloadQR}
										className="rounded-xl font-bold"
									>
										Download QR Code
									</Button>
								</div>
							)}
						</div>
					)}
				</div>

				<div className="mt-10">
					<Button
						variant="secondary"
						onClick={onClose}
						className="w-full rounded-2xl py-6 font-bold"
					>
						Done
					</Button>
				</div>
			</div>
		</div>
	);
};
