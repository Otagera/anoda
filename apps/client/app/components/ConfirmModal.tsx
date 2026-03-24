import type React from "react";
import { useEffect } from "react";

interface ConfirmModalProps {
	isOpen: boolean;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
	onConfirm: () => void;
	onCancel: () => void;
	isDestructive?: boolean;
	isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
	isOpen,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	onConfirm,
	onCancel,
	isDestructive = true,
	isLoading = false,
}) => {
	// Prevent body scroll when modal is open
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "unset";
		}
		return () => {
			document.body.style.overflow = "unset";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
				onClick={isLoading ? undefined : onCancel}
				aria-hidden="true"
			/>

			{/* Modal Panel */}
			<div className="relative bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
				<div className="p-6 sm:p-8">
					<div className="flex items-center space-x-4 mb-4">
						<div
							className={`p-3 rounded-2xl flex-shrink-0 ${
								isDestructive
									? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
									: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
							}`}
						>
							{isDestructive ? (
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
										d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
									/>
								</svg>
							) : (
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
										d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							)}
						</div>
						<h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
							{title}
						</h2>
					</div>
					<p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed mb-8">
						{message}
					</p>

					<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
						<button
							type="button"
							onClick={onCancel}
							disabled={isLoading}
							className="px-5 py-2.5 text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all font-semibold active:scale-95 disabled:opacity-50 w-full sm:w-auto"
						>
							{cancelText}
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isLoading}
							className={`px-5 py-2.5 text-white rounded-xl transition-all font-semibold active:scale-95 disabled:opacity-50 w-full sm:w-auto flex items-center justify-center space-x-2 ${
								isDestructive
									? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/25"
									: "bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25"
							}`}
						>
							{isLoading && (
								<svg
									className="animate-spin h-4 w-4 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										className="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										strokeWidth="4"
									/>
									<path
										className="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									/>
								</svg>
							)}
							<span>{isLoading ? "Processing..." : confirmText}</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
