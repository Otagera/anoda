import type { RouteObject } from "react-router-dom";
import App, { ErrorBoundary as AppErrorBoundary } from "./root";
import Welcome from "./welcome/Welcome";
import Home from "./routes/home";
import Album from "./routes/album";
import Search from "./routes/search";
import Login from "./routes/login";
import Signup from "./routes/signup";
import PrivateRoute from "./components/PrivateRoute";
import ImageDetail from "./routes/imageDetail";

export default [
	{
		path: "/",
		element: <App />,
		ErrorBoundary: AppErrorBoundary,
		children: [
			{
				index: true,
				element: <Welcome />,
			},
			{
				path: "login",
				element: <Login />,
			},
			{
				path: "signup",
				element: <Signup />,
			},
			{
				element: <PrivateRoute />,
				children: [
					{
						path: "home",
						element: <Home />,
					},
					{
						path: "album/:albumId",
						element: <Album />,
					},
					{
						path: "search",
						element: <Search />,
					},
					{
						path: "images/:imageId",
						element: <ImageDetail />,
					},
				],
			},
		],
	},
] satisfies RouteObject[];
