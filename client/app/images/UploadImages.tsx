import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { uploadImages } from "~/utils/api";
// import type { ActionFunctionArgs } from "react-router";
// import { type FileUpload, parseFormData } from "@mjackson/form-data-parser";
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

const UploadImages: React.FC = () => {
	const [files, setFiles] = useState<FileList | null>(null);
	const queryClient = useQueryClient();

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		if (event.target.files) {
			setFiles(event.target.files);
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
		mutation.mutate(formData);
	};

	const mutation = useMutation({
		mutationFn: uploadImages,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["images"] }); // Invalidate cache after upload
		},
	});

	if (mutation.isPending) return <div>Uploading Image...</div>;
	if (mutation.isError)
		return <div>An error occurred: {mutation.error.message}</div>;
	if (mutation.isSuccess) return <div>Image Uploaded Successfully!</div>;

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
