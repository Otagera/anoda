import React, { useState } from "react";
// import type { ActionFunctionArgs } from "react-router";
// import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
import type { UploadImagesProps } from "../interface";
import api from "~/utils/axios";

// export const action = async ({ request }: ActionFunctionArgs) => {
// 	const uploadHandler = async (fileUpload: FileUpload) => {
// 		console.log("fileUpload", fileUpload);
// 		if (fileUpload.fieldName === "files") {
// 			// process the upload and return a File
// 		}
// 	};

// 	const formData = await parseFormData(request, uploadHandler);
// 	// 'avatar' has already been processed at this point
// 	const file = formData.get("avatar");
// };

const UploadImages: React.FC<UploadImagesProps> = ({}: // sendToParent,
UploadImagesProps) => {
	// const { imageUrl, imageSize, boundingBox } = sendToParent;
	const [files, setFiles] = useState<FileList | null>(null);

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		console.log("event.target.files", event.target.files);
		if (event.target.files) {
			const file = event.target.files?.[0]; // Get the selected file
			setFiles(event.target.files);

			const tempImageUrl = URL.createObjectURL(file);
			// imageUrl(tempImageUrl);
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
			const response = await api.post("/upload", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			console.log("Success:", response);
			// imageSize(response.data?.imageSize);
			// boundingBox(response.data?.boundingBox);
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

export default UploadImages;
