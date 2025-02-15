import React, { useState } from "react";
import axios from "axios";
import {
	useQuery,
	useMutation,
	useQueryClient,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";

const SearchImage: React.FC = () => {
	const [file, setFile] = useState<File | null>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setFile(event.target.files[0]);
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		const formData = new FormData();
		if (file) {
			formData.append("searchFaceImage", file);
		}

		try {
			const response = await axios.post(
				"http://localhost:5001/api/search",
				formData
			);
			console.log("Success:", response);
		} catch (error) {
			console.error("Error uploading file:", error);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<label htmlFor="fileToSearch">Upload File</label>
			<input id="fileToSearch" type="file" onChange={handleFileChange} />
			<button type="submit">Search</button>
		</form>
	);
};

export default SearchImage;
