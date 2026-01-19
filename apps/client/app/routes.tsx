import type { RouteObject } from "react-router-dom";
import App from "./root";
import Welcome from "./welcome/Welcome";
import Home from "./routes/home";
import Album from "./routes/album";
import Search from "./routes/search";
import Login from "./routes/login";
import Signup from "./routes/signup";
import PrivateRoute from "./components/PrivateRoute";

export default [
	{
		path: "/",
		element: <App />,
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
				],
			},
		],
	},
] satisfies RouteObject[];
