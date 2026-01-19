import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import routes from "./routes.tsx";
import "./index.css";

const queryClient = new QueryClient();

const router = createBrowserRouter(routes);

ReactDOM.hydrateRoot(
	document.getElementById("root")!,
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</React.StrictMode>,
);
