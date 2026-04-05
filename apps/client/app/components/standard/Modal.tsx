import type { ReactNode } from "react";

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: ReactNode;
	title?: string;
	description?: string;
	size?: "sm" | "md" | "lg" | "xl" | "full";
	className?: string;
}

const sizeClasses = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-xl",
	full: "max-w-4xl",
};

export const Modal = ({
	isOpen,
	onClose,
	children,
	title,
	description,
	size = "md",
	className = "",
}: ModalProps) => {
	if (!isOpen) return null;

	const handleOverlayClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
			onClick={handleOverlayClick}
			onKeyDown={(e) => e.key === "Escape" && onClose()}
			role="dialog"
			aria-modal="true"
		>
			<div
				className={`bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-[2rem] shadow-2xl w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300 overflow-hidden ${sizeClasses[size]} ${className}`}
				role="document"
			>
				{(title || description) && (
					<div className="flex justify-between items-start mb-6">
						<div>
							{title && (
								<h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white">
									{title}
								</h2>
							)}
							{description && (
								<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
									{description}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 shrink-0"
							aria-label="Close modal"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								aria-hidden="true"
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
				)}
				{children}
			</div>
		</div>
	);
};

interface ModalSectionProps {
	children: ReactNode;
	className?: string;
}

export const ModalSection = ({
	children,
	className = "",
}: ModalSectionProps) => {
	return <div className={`space-y-4 ${className}`}>{children}</div>;
};
