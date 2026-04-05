import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	error?: string;
	hint?: string;
	icon?: ReactNode;
}

export const Input = ({
	label,
	error,
	hint,
	icon,
	className = "",
	...props
}: InputProps) => {
	return (
		<div className="space-y-1">
			{label && (
				<label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
					{label}
				</label>
			)}
			<div className="relative">
				{icon && (
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
						{icon}
					</div>
				)}
				<input
					className={`
						w-full px-4 py-2.5 rounded-xl border bg-white dark:bg-zinc-900 
						text-sm font-medium text-zinc-900 dark:text-white
						placeholder:text-zinc-400 dark:placeholder:text-zinc-500
						focus:outline-none focus:ring-2 focus:ring-sage focus:border-transparent
						transition-all duration-200
						disabled:opacity-50 disabled:cursor-not-allowed
						${icon ? "pl-10" : ""}
						${error ? "border-plum focus:ring-plum" : "border-zinc-200 dark:border-zinc-700"}
						${className}
					`}
					{...props}
				/>
			</div>
			{hint && !error && (
				<p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
			)}
			{error && <p className="text-xs text-plum font-medium">{error}</p>}
		</div>
	);
};
