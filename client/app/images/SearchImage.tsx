import type { Route } from "../routes/+types/images";
import React, { useState } from "react";
import { Form } from "react-router";
import api from "~/utils/axios";

export async function action({ request }: Route.ActionArgs) {
	let formData = await request.formData();

	try {
		const response = await api.post("search", formData);
		console.log("Success:", response);
		return response;
	} catch (error) {
		console.error("Error uploading file:", error);
	}
}

const SearchImage = ({ actionData }: Route.ComponentProps) => {
	const [file, setFile] = useState<File | null>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setFile(event.target.files[0]);
		}
	};

	return (
		<>
			<Form method="post">
				<label htmlFor="fileToSearch">Upload File</label>
				<input id="fileToSearch" type="file" onChange={handleFileChange} />
				<button type="submit">Search</button>
			</Form>
			{actionData ? <p>{actionData} sent</p> : null}
		</>
	);
};

export default SearchImage;
