import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "../utils/auth";

const SignupPage = () => {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const { signup } = useAuth();

	const mutation = useMutation({
		mutationFn: signup,
		onSuccess: () => {
			navigate("/home");
		},
	});

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (password !== confirmPassword) {
			alert("Passwords do not match");
			return;
		}
		mutation.mutate({ email, password });
	};

	return (
		<div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
			<div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
				<h1 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-200">
					Sign Up
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
					<div>
						<label className="block mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">
							Confirm Password
						</label>
						<input
							type="password"
							className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
					</div>
					<button
						type="submit"
						className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-50"
						disabled={mutation.isPending}
					>
						{mutation.isPending ? "Signing up..." : "Sign Up"}
					</button>
					{mutation.isError && (
						<p className="text-sm text-red-600">{mutation.error.message}</p>
					)}
				</form>
				<p className="text-sm text-center text-gray-600 dark:text-gray-400">
					Already have an account?{" "}
					<Link to="/login" className="text-blue-600 hover:underline">
						Login
					</Link>
				</p>
			</div>
		</div>
	);
};

export default SignupPage;
