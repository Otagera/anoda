import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useAuth } from "../utils/auth";

const LoginPage = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const { login, isAuthenticated, isInitialized } = useAuth();

	useEffect(() => {
		if (isInitialized && isAuthenticated) {
			navigate("/home", { replace: true });
		}
	}, [isInitialized, isAuthenticated, navigate]);

	const mutation = useMutation({
		mutationFn: login,
		onSuccess: () => {
			navigate("/home");
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		mutation.mutate({ email, password });
	};

	return (
		<div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
			<div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
				<h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
					Login
				</h1>
				<form className="space-y-6" onSubmit={handleSubmit}>
					<div>
						<label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
							Email
						</label>
						<input
							type="email"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div>
						<label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
							Password
						</label>
						<input
							type="password"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
					</div>
					<button
						type="submit"
						className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Logging in..." : "Login"}
					</button>
					{mutation.isError && (
						<p className="text-sm text-red-600">{mutation.error.message}</p>
					)}
				</form>
				<p className="text-sm text-center text-gray-600 dark:text-gray-400">
					Don't have an account?{" "}
					<Link to="/signup" className="text-blue-600 hover:underline">
						Sign up
					</Link>
				</p>
			</div>
		</div>
	);
};

export default LoginPage;
