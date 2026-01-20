import { useEffect, useState } from "react";

export const ThemeToggle = () => {
	const [theme, setTheme] = useState<"light" | "dark" | null>(null);

	useEffect(() => {
		const saved = localStorage.getItem("theme") as "light" | "dark" | null;
		const initialTheme =
			saved ||
			(window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light");
		setTheme(initialTheme);
	}, []);

	useEffect(() => {
		if (theme) {
			const root = window.document.documentElement;
			if (theme === "dark") {
				root.classList.add("dark");
			} else {
				root.classList.remove("dark");
			}
			localStorage.setItem("theme", theme);
		}
	}, [theme]);

	const toggleTheme = () => {
		const newTheme = theme === "light" ? "dark" : "light";
		setTheme(newTheme);
		const root = window.document.documentElement;
		if (newTheme === "dark") {
			root.classList.add("dark");
		} else {
			root.classList.remove("dark");
		}
		localStorage.setItem("theme", newTheme);
	};

	if (!theme) return <div className="p-2 w-9 h-9" />;

	return (
		<button
			onClick={toggleTheme}
			className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none bg-gray-100 dark:bg-gray-800"
			aria-label="Toggle theme"
		>
			{theme === "light" ? (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-5 h-5 text-gray-700"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
					/>
				</svg>
			) : (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-5 h-5 text-yellow-400"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M3 12h2.25m.386-6.364l1.591 1.591M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
					/>
				</svg>
			)}
		</button>
	);
};
