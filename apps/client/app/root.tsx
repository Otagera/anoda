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
import { Button } from "./components/standard/Button";
import { Heading } from "./components/standard/Heading";
import { ThemeToggle } from "./components/ThemeToggle";
import { UploadManager } from "./components/UploadManager";
import { AuthProvider, useAuth } from "./utils/auth";
import { EventsProvider } from "./utils/EventsContext";
import { UploadProvider } from "./utils/UploadContext";
import { Card } from "./components/standard/Card";

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
		<nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all duration-300">
			<div className="max-w-6xl mx-auto px-6 sm:px-10 py-5 flex justify-between items-center">
				<Link to="/" className="group flex items-center space-x-2">
					<div className="w-8 h-8 bg-sage rounded-xl flex items-center justify-center shadow-lg shadow-sage/20 transition-transform group-hover:scale-110">
						<div className="w-3 h-3 bg-zinc-950 rounded-full" />
					</div>
					<span className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white">
						anoda<span className="text-sage">.</span>facematch
					</span>
				</Link>
				<div className="flex items-center space-x-6">
					<ThemeToggle />
					{isHydrated && isAuthenticated && (
						<>
							<Link
								to="/home"
								className="text-zinc-500 dark:text-zinc-400 hover:text-sage dark:hover:text-sage font-bold text-sm transition-colors cursor-pointer"
							>
								Home
							</Link>
							<Link
								to="/settings"
								className="text-zinc-500 dark:text-zinc-400 hover:text-sage dark:hover:text-sage font-bold text-sm transition-colors cursor-pointer"
							>
								Settings
							</Link>
							<button
								type="button"
								onClick={handleLogout}
								className="text-zinc-500 dark:text-zinc-400 hover:text-plum dark:hover:text-plum font-bold text-sm transition-colors cursor-pointer"
							>
								Logout
							</button>
						</>
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
									background: "oklch(20% 0.02 250 / 80%)",
									backdropFilter: "blur(20px) saturate(160%)",
									color: "#fff",
									border: "1px solid rgba(255,255,255,0.1)",
									borderRadius: "1.5rem",
									padding: "12px 20px",
									fontSize: "14px",
									fontWeight: "600",
									boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
								},
								success: {
									iconTheme: {
										primary: "oklch(58% 0.031 107.3)",
										secondary: "#fff",
									},
								},
								error: {
									iconTheme: {
										primary: "oklch(36.4% 0.029 323.89)",
										secondary: "#fff",
									},
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
		<main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-6 antialiased font-sans">
			<Card
				className="max-w-md w-full p-12 text-center border-none shadow-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl"
				hoverable={false}
			>
				<div className="w-20 h-20 bg-plum/10 text-plum rounded-[2rem] flex items-center justify-center mx-auto mb-8">
					<span className="text-4xl font-black">
						{message === "404" ? "404" : "!"}
					</span>
				</div>
				<Heading level={1} className="mb-4">
					{message}
				</Heading>
				<p className="text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed font-medium">
					{details}
				</p>
				<div className="flex flex-col space-y-3">
					<Button onClick={() => (window.location.href = "/home")}>
						Return to Home
					</Button>
				</div>
				{stack && (
					<div className="mt-12 text-left">
						<details className="cursor-pointer group">
							<summary className="text-xs text-zinc-500 font-bold uppercase tracking-widest group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
								Technical Stack Trace
							</summary>
							<pre className="mt-4 w-full p-6 overflow-x-auto bg-zinc-950 rounded-2xl text-[10px] font-mono text-plum/80 border border-zinc-800 leading-relaxed">
								<code>{stack}</code>
							</pre>
						</details>
					</div>
				)}
			</Card>
		</main>
	);
}
