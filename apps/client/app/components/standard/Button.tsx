import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "~/utils/cn"; // Assuming a cn utility exists, if not I'll create it or use template literals

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
	size?: "sm" | "md" | "lg";
	children: ReactNode;
}

export const Button = ({
	variant = "primary",
	size = "md",
	className,
	children,
	...props
}: ButtonProps) => {
	const variants = {
		primary: "bg-sage hover:bg-sage/90 text-zinc-950 shadow-sm",
		secondary: "bg-terracotta hover:bg-terracotta/90 text-white",
		ghost:
			"bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
		danger: "bg-plum hover:bg-plum/90 text-white",
		outline:
			"bg-transparent border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300",
	};

	const sizes = {
		sm: "px-3 py-1.5 text-xs",
		md: "px-5 py-2.5 text-sm",
		lg: "px-8 py-4 text-base",
	};

	return (
		<button
			className={cn(
				"inline-flex items-center justify-center font-semibold rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 cursor-pointer",
				variants[variant],
				sizes[size],
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
};
