import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../utils/auth";

const Welcome = () => {
	const { isAuthenticated, isInitialized } = useAuth();

	if (isInitialized && isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
			<h1 className="text-4xl font-bold text-gray-900 dark:text-white">
				Welcome to Anoda Facematch
			</h1>
			<p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
				Upload your photos, organize them into albums, and find faces.
			</p>
			<Link
				to="/home"
				className="mt-8 px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700"
			>
				Get Started
			</Link>
		</div>
	);
};

export default Welcome;
