import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import {
	isRouteErrorResponse,
	Link,
	Outlet,
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

const Navbar = () => {
	const { isAuthenticated, logout } = useAuth();
	const navigate = useNavigate();
	const [isHydrated, setIsHydrated] = useState(false);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	const handleLogout = () => {
		logout();
		navigate("/login");
	};

	return (
		<nav className="sticky top-0 z-50 w-full bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 transition-colors duration-200">
			<div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex justify-between items-center">
					<Link to="/" className="text-2xl font-bold text-indigo-500">
						Anoda Facematch
					</Link>
				<div className="flex items-center space-x-4">
					<ThemeToggle />
					{isHydrated && isAuthenticated && (
						<button
							type="button"
							onClick={handleLogout}
							className="text-zinc-600 dark:text-zinc-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors cursor-pointer"
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
	return (
		<>
			<Navbar />
			<main className="w-full h-full">
				<Outlet />
			</main>
		</>
	);
};

export default function App() {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<QueryClientProvider client={queryClient}>
			<AuthProvider>
				<EventsProvider>
					<UploadProvider>
						<AppContent />
						<UploadManager />
						<Toaster
							position="bottom-center"
							toastOptions={{
								style: {
									background: "rgba(24, 24, 27, 0.62)",
									color: "#f4f4f5",
									border: "1px solid rgba(255,255,255,0.18)",
									borderRadius: "1rem",
									boxShadow: "0 20px 45px -14px rgba(0, 0, 0, 0.48)",
									backdropFilter: "blur(14px) saturate(140%)",
								},
							}}
						/>
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
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 antialiased font-sans">
			<div className="max-w-md w-full bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl shadow-2xl rounded-2xl p-8 text-center border border-zinc-200/50 dark:border-zinc-800/50">
				<h1 className="text-6xl font-extrabold text-indigo-500 mb-4">
					{message}
				</h1>
				<p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
					{details}
				</p>
				<p className="text-zinc-600 dark:text-zinc-400 mb-8">
					Something went wrong on our end. Please try again later or return to
					the home page.
				</p>
				<Link
					to="/home"
					className="inline-block px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
				>
					Back to Home
				</Link>
				{stack && (
					<div className="mt-8 text-left">
						<details className="cursor-pointer group">
							<summary className="text-sm text-zinc-500 group-hover:text-zinc-700 dark:text-zinc-400 dark:group-hover:text-zinc-200 transition-colors">
								Technical Details
							</summary>
							<pre className="mt-2 w-full p-4 overflow-x-auto bg-zinc-100 dark:bg-zinc-900/50 rounded-xl text-xs font-mono text-red-600 dark:text-red-400 border border-zinc-200 dark:border-zinc-800">
								<code>{stack}</code>
							</pre>
						</details>
					</div>
				)}
			</div>
		</main>
	);
}
