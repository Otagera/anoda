import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../utils/auth";

const PrivateRoute = () => {
	const { isAuthenticated, isInitialized } = useAuth();

	if (!isInitialized) {
		return (
			<div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
				{/* Sidebar Skeleton */}
				<div className="hidden md:flex w-64 flex-col border-r border-zinc-200/50 dark:border-zinc-800/50 p-6 space-y-8 animate-pulse">
					<div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
					<div className="space-y-4">
						<div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-md"></div>
						<div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
						<div className="h-10 w-full bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
					</div>
				</div>

				{/* Main Content Skeleton */}
				<div className="flex-1 flex flex-col p-6 md:p-12 space-y-8 animate-pulse">
					<div className="flex justify-between items-center">
						<div className="h-8 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
						<div className="h-10 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl"></div>
					</div>

					{/* Grid Skeleton */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full auto-rows-[200px]">
						{[...Array(8)].map((_, i) => (
							<div
								key={i}
								className={`bg-zinc-200 dark:bg-zinc-800 rounded-3xl ${i % 3 === 0 ? "md:col-span-2 md:row-span-2" : ""}`}
							></div>
						))}
					</div>
				</div>
			</div>
		);
	}

	return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
