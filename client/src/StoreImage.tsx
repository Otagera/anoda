import React, { useState } from "react";
import axios from "axios";
import { StoreImageProps } from "./interface";

const StoreImage: React.FC<StoreImageProps> = ({
	sendToParent,
}: StoreImageProps) => {
	const { imageUrl, imageSize, boundingBox } = sendToParent;
	const [file, setFile] = useState<File | null>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			const file = event.target.files?.[0]; // Get the selected file
			setFile(event.target.files[0]);

			const tempImageUrl = URL.createObjectURL(file);
			imageUrl(tempImageUrl);
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		const formData = new FormData();
		if (file) {
			formData.append("image", file);
		}

		try {
			const response = await axios.post(
				"http://localhost:5001/api/upload",
				formData
			);
			console.log("Success:", response);
			imageSize(response.data?.imageSize);
			boundingBox(response.data?.boundingBox);
		} catch (error) {
			console.error("Error uploading file:", error);
		}
	};

	return (
		<form onSubmit={handleSubmit}>
			<label htmlFor="fileToUpload">Upload File</label>
			<input id="fileToUpload" type="file" onChange={handleFileChange} />
			<button type="submit">Upload</button>
		</form>
	);
};

export default StoreImage;
