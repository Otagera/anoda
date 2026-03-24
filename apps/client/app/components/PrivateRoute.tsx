import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../utils/auth";

const PrivateRoute = () => {
	const { isAuthenticated, isInitialized } = useAuth();

	if (!isInitialized) {
		return <div>Loading...</div>;
	}

	return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
