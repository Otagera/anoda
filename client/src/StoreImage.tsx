import React, { useState } from "react";
import axios from "axios";
import { StoreImageProps } from "./interface";

const StoreImage: React.FC<StoreImageProps> = ({
	sendToParent,
}: StoreImageProps) => {
	const { imageUrl, imageSize, boundingBox } = sendToParent;
	const [files, setFiles] = useState<FileList | null>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		console.log("event.target.files", event.target.files);
		if (event.target.files) {
			const file = event.target.files?.[0]; // Get the selected file
			setFiles(event.target.files);

			const tempImageUrl = URL.createObjectURL(file);
			imageUrl(tempImageUrl);
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		const formData = new FormData();
		if (files?.length) {
			for (const file of files) {
				formData.append(`uploadedImages`, file);
			}
		}
		console.log("formData", formData.getAll("uploadedImages"));
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
			<input
				id="fileToUpload"
				type="file"
				multiple
				name="files[]"
				onChange={handleFileChange}
			/>
			<button type="submit">Upload</button>
		</form>
	);
};

export default StoreImage;
