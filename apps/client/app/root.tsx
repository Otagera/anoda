import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import {
	isRouteErrorResponse,
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useNavigate,
} from "react-router-dom";

import type { Route } from "./+types/root";
import "./index.css";
import "./app.css";
import { ThemeToggle } from "./components/ThemeToggle";
import { UploadManager } from "./components/UploadManager";
import { AuthProvider, useAuth } from "./utils/auth";
import { EventsProvider } from "./utils/EventsContext";
import { UploadProvider } from "./utils/UploadContext";

// Create a client
const queryClient = new QueryClient();

const Navbar = () => {
	const { isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<nav className="bg-white dark:bg-gray-800 shadow-md transition-colors duration-200">
			<div className="container mx-auto px-4 py-4 flex justify-between items-center">
				<Link to="/" className="text-2xl font-bold text-blue-600">
					Anoda Facematch
				</Link>
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					{isAuthenticated && (
						<button
							onClick={handleLogout}
							className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors cursor-pointer"
						>
							Logout
						</button>
					)}
				</div>
			</div>
		</nav>
	);
};

const AppContent = () => {
	useEffect(() => {
		const theme = localStorage.getItem("theme");
		const root = window.document.documentElement;
		const body = window.document.body;

		const applyTheme = (t: string) => {
			if (t === "dark") {
				root.classList.add("dark");
				body.classList.add("bg-gray-900", "text-gray-100");
				body.classList.remove("bg-gray-50", "text-gray-900");
			} else {
				root.classList.remove("dark");
				body.classList.add("bg-gray-50", "text-gray-900");
				body.classList.remove("bg-gray-900", "text-gray-100");
			}
		};

		if (theme) {
			applyTheme(theme);
		} else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
			applyTheme("dark");
		} else {
			applyTheme("light");
		}
	}, []);

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
			<Navbar />
			<Outlet />
		</div>
	);
};

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<EventsProvider>
					<UploadProvider>
						<AppContent />
						<UploadManager />
					</UploadProvider>
				</EventsProvider>
			</AuthProvider>
		</QueryClientProvider>
	);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	let message = "Oops!";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (import.meta.env.DEV && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	return (
		<main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
			<div className="max-w-md w-full bg-white dark:bg-gray-800 shadow-xl rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
				<h1 className="text-6xl font-extrabold text-blue-600 mb-4">
					{message}
				</h1>
				<p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
					{details}
				</p>
				<p className="text-gray-600 dark:text-gray-400 mb-8">
					Something went wrong on our end. Please try again later or return to
					the home page.
				</p>
				<Link
					to="/home"
					className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md"
				>
					Back to Home
				</Link>
				{stack && (
					<div className="mt-8 text-left">
						<details className="cursor-pointer">
							<summary className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
								Technical Details
							</summary>
							<pre className="mt-2 w-full p-4 overflow-x-auto bg-gray-100 dark:bg-gray-900 rounded-lg text-xs font-mono text-red-600 dark:text-red-400">
								<code>{stack}</code>
							</pre>
						</details>
					</div>
				)}
			</div>
		</main>
	);
}
