import type { Route } from "./+types/home";
import Welcome from "~/welcome/Welcome";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Anoda" },
		{ name: "description", content: "Welcome to Anoda Facematch app!" },
	];
}

const Home = () => {
	return (
		<>
			<Welcome />
		</>
	);
};
export default Home;
