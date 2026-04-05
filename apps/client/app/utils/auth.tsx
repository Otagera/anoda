import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { login as apiLogin, signup as apiSignup } from "./api";
import axiosAPI from "./axios";

interface User {
	id: string;
	email: string;
	// Add other user properties as needed
}

interface AuthContextType {
	user: User | null;
	login: (credentials: { email: string; password: string }) => Promise<void>;
	signup: (credentials: { email: string; password: string }) => Promise<void>;
	logout: () => void;
	isAuthenticated: boolean;
	isInitialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isInitialized, setIsInitialized] = useState(false);
	const authCheckRef = useRef(false);

	useEffect(() => {
		const checkAuth = async () => {
			if (authCheckRef.current) return;
			authCheckRef.current = true;

			try {
				const response = await axiosAPI.get("/auth/me");
				if (response.data?.status === "completed" && response.data?.data) {
					setUser(response.data.data);
				}
			} catch (error) {
				setUser(null);
			} finally {
				authCheckRef.current = false;
				setIsInitialized(true);
			}
		};

		if (!isInitialized) {
			checkAuth();
		}
	}, [isInitialized]);

	const login = async (credentials: { email: string; password: string }) => {
		try {
			const response = await apiLogin(credentials);

			if (response?.data?.status === "completed" && response?.data?.data) {
				setUser(response.data.data);
			} else {
				throw new Error("Login failed");
			}
		} catch (error: any) {
			throw new Error(
				error.response?.data?.message || error.message || "Login failed",
			);
		}
	};

	const signup = async (credentials: { email: string; password: string }) => {
		try {
			const response = await apiSignup(credentials);
			if (response?.data?.status === "completed" && response?.data?.data) {
				setUser(response.data.data);
			} else {
				throw new Error("Signup failed");
			}
		} catch (error: any) {
			throw new Error(
				error.response?.data?.message || error.message || "Signup failed",
			);
		}
	};

	const logout = async () => {
		try {
			await axiosAPI.post("/auth/logout");
		} catch (error) {
			console.error("Logout failed", error);
		} finally {
			setUser(null);
		}
	};

	const isAuthenticated = !!user;

	return (
		<AuthContext.Provider
			value={{
				user,
				login,
				signup,
				logout,
				isAuthenticated,
				isInitialized,
			}}
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
