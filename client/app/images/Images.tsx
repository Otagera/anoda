import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "~/utils/axios";
import type { ImagesFromDB } from "~/interface";

const Images: React.FC = () => {
	const [images, setImages] = useState<ImagesFromDB[] | null>(null);

	// Access the client
	const queryClient = useQueryClient();

	// Queries
	const query = useQuery({
		queryKey: ["images"],
		queryFn: async () => {
			try {
				const response = await api.get("/pictures");
				console.log("Success:", response);
				return response.data;
			} catch (error) {
				console.error("Error uploading file:", error);
			}
		},
	});

	useEffect(() => {
		if (query.data) {
			console.log("query.data.data", query.data.data);
			setImages(query.data?.data);
		}
	}, [query.data]);

	return (
		<>
			{images?.map((image, index) => {
				return (
					<img src={`${image.image_path}`} alt={image.image_path} key={index} />
				);
			})}
		</>
	);
};

export default Images;
