import type { Route } from "./+types/home";
import ImagesList from "../Images/Images";
import UploadImages from "~/Images/UploadImages";

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Anoda - Images" },
		{ name: "description", content: "Welcome to Anoda Facematch app!" },
	];
}

const Images = () => {
	return (
		<>
			<p>Please upload your pictures</p>
			<UploadImages />
			<ImagesList />
		</>
	);
};
export default Images;
