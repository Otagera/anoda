import type { HTMLAttributes } from "react";

interface ImageGridItemProps extends HTMLAttributes<HTMLImageElement> {
	image: {
		width: number;
		height: number;
		url: string;
		alt: string;
		id: string;
	};
	onDelete: (imageId: string) => void;
	shared?: boolean;
	isSelected?: boolean;
	onToggleSelect?: (imageId: string) => void;
	selectionMode?: boolean;
	containerClassName?: string;
}

const ImageGridItem = ({
	image,
	className,
	onClick,
	onDelete,
	isSelected,
	onToggleSelect,
	selectionMode,
	containerClassName = "",
	shared = false,
}: ImageGridItemProps) => {
	return (
		<div
			className={`relative group overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800 transition-all duration-500 h-full ${containerClassName} ${
				isSelected
					? "ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-950 scale-[0.98] shadow-lg shadow-indigo-500/20"
					: "hover:shadow-2xl hover:shadow-indigo-500/10"
			}`}
		>
			<img
				src={image.url}
				alt={image.alt}
				loading="lazy"
				className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${className} ${isSelected ? "opacity-90" : ""}`}
				onClick={(e) => {
					if (selectionMode && onToggleSelect) {
						onToggleSelect(image.id);
					} else if (onClick) {
						onClick(e);
					}
				}}
			/>

			{/* Selection Checkbox */}
			<div
				className={`absolute top-2 left-2 transition-all duration-200 ${
					selectionMode || isSelected
						? "opacity-100 scale-100"
						: "opacity-0 scale-0 group-hover:opacity-100 group-hover:scale-100"
				}`}
			>
				<button
					onClick={(e) => {
						e.stopPropagation();
						onToggleSelect?.(image.id);
					}}
					className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all border ${
						isSelected
							? "bg-indigo-600 border-indigo-500 text-white"
							: "bg-black/20 backdrop-blur-md border-white/20 text-transparent hover:border-white/40"
					}`}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="h-4 w-4"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<button
				className={`absolute top-2 right-2 p-2.5 bg-black/40 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500 shadow-lg backdrop-blur-md border border-white/10 active:scale-90 ${shared ? "hidden" : ""}`}
				onClick={(e) => {
					e.stopPropagation(); // Prevent image click from firing
					onDelete(image.id);
				}}
				title="Delete image"
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
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
			</button>
		</div>
	);
};

export default ImageGridItem;
