import type { Route } from "./+types/home";
import UploadImages from "../UploadImages/UploadImages";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "New React Router App" },
		{ name: "description", content: "Welcome to React Router!" },
	];
}

const Home = () => {
	return (
		<>
			<h3>Welcome to Anoda</h3>
			<p>Please upload your pictures</p>
			<UploadImages />
		</>
	);
};
export default Home;
