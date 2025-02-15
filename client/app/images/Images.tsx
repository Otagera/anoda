import React, { useState, useEffect } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const Images: React.FC = () => {
	const [images, setImages] = useState<string[] | null>(null);

	// Access the client
	const queryClient = useQueryClient();

	// Queries
	const query = useQuery({
		queryKey: ["images"],
		queryFn: async () => {
			try {
				const response = await axios.get("http://localhost:5001/api/images");
				console.log("Success:", response);
				return response.data;
			} catch (error) {
				console.error("Error uploading file:", error);
			}
		},
	});

	useEffect(() => {
		setImages(query.data);
	}, [query.data]);

	return (
		<>
			{images?.map((image, index) => {
				return <img src={image} alt={image} key={index} />;
			})}
		</>
	);
};

export default Images;
