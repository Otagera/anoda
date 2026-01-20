import type { RouteObject } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import App, { ErrorBoundary as AppErrorBoundary } from "./root";
import Album from "./routes/album";
import Home from "./routes/home";
import ImageDetail from "./routes/imageDetail";
import Login from "./routes/login";
import Search from "./routes/search";
import SharedAlbum from "./routes/sharedAlbum";
import SharedImageDetail from "./routes/sharedImageDetail";
import Signup from "./routes/signup";
import Welcome from "./welcome/Welcome";

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
				path: "share/:token",
				element: <SharedAlbum />,
			},
			{
				path: "share/:token/images/:imageId",
				element: <SharedImageDetail />,
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
