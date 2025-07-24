import React, {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
} from "react";
import { login as apiLogin, signup as apiSignup } from "./api";

interface User {
	email: string;
	// Add other user properties as needed
}

interface AuthContextType {
	token: string | null;
	user: User | null;
	login: (credentials: { email: string; password: string }) => Promise<void>;
	signup: (credentials: { email: string; password: string }) => Promise<void>;
	logout: () => void;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [token, setToken] = useState<string | null>(
		localStorage.getItem("token")
	);
	const [user, setUser] = useState<User | null>(null);

	useEffect(() => {
		if (token) {
			// In a real app, you'd decode the token or fetch user data from an API
			// For now, we'll just assume a user is logged in if a token exists
			setUser({ email: "user@example.com" }); // Placeholder user data
		} else {
			setUser(null);
		}
	}, [token]);

	const login = async (credentials: { email: string; password: string }) => {
		const response = await apiLogin(credentials);

		if (response && response.data && response.data.accessToken) {
			localStorage.setItem("token", response.data.accessToken);
			setToken(response.data.accessToken);
			// Optionally, fetch user data here if your API returns it separately
		} else {
			throw new Error("Login failed");
		}
	};

	const signup = async (credentials: { email: string; password: string }) => {
		const response = await apiSignup(credentials);
		if (response && response.token) {
			localStorage.setItem("token", response.token);
			setToken(response.token);
			// Optionally, fetch user data here
		} else {
			throw new Error("Signup failed");
		}
	};

	const logout = () => {
		localStorage.removeItem("token");
		setToken(null);
		setUser(null);
	};

	const isAuthenticated = !!token;

	return (
		<AuthContext.Provider
			value={{ token, user, login, signup, logout, isAuthenticated }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
