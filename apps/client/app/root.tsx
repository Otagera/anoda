import {
	isRouteErrorResponse,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useNavigate,
	Link,
} from "react-router-dom";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import type { Route } from "./+types/root";
import "./index.css";
import "./app.css";
import { AuthProvider, useAuth } from "./utils/auth";
import { ThemeToggle } from "./components/ThemeToggle";

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
							className="text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
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
				<AppContent />
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
		<main className="pt-16 p-4 container mx-auto">
			<h1>{message}</h1>
			<p>{details}</p>
			{stack && (
				<pre className="w-full p-4 overflow-x-auto">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}
