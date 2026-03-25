import type React from "react";

interface MainContainerProps {
	children: React.ReactNode;
	className?: string;
	maxWidth?: string; // e.g. "max-w-7xl", "max-w-[1600px]", "container"
}

export const MainContainer: React.FC<MainContainerProps> = ({
	children,
	className = "",
	maxWidth = "container",
}) => {
	return (
		<div className="min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 transition-colors duration-300 antialiased font-sans">
			<div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-12 ${className}`}>
				{children}
			</div>
		</div>
	);
};
