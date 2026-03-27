import { Link } from "react-router-dom";

interface BackButtonProps {
	to?: string;
	label?: string;
	shareToken?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({
	to,
	label,
	shareToken,
}) => {
	const finalTo = to || (shareToken ? `/share/${shareToken}` : "/home");
	const finalLabel =
		label || (shareToken ? "Back to Album" : "Back to Dashboard");

	return (
		<Link
			to={finalTo}
			className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white mb-8 transition-colors group font-medium"
		>
			<span className="group-hover:-translate-x-1 transition-transform">
				&larr;
			</span>
			{finalLabel}
		</Link>
	);
};
