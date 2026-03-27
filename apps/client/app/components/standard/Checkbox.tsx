import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
	label?: string;
}

export const Checkbox = ({ label, className = "", ...props }: CheckboxProps) => {
	return (
		<label className="flex items-center gap-3 cursor-pointer group">
			<input
				type="checkbox"
				className={`
					w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 
					text-sage focus:ring-sage focus:ring-offset-0
					bg-white dark:bg-zinc-800
					transition-all duration-200
					disabled:opacity-50 disabled:cursor-not-allowed
					${className}
				`}
				{...props}
			/>
			{label && (
				<span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-sage transition-colors">
					{label}
				</span>
			)}
		</label>
	);
};
