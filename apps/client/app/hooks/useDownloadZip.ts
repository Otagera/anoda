import JSZip from "jszip";
import toast from "react-hot-toast";

interface Image {
	imageId: string;
	imagePath: string;
	[index: string]: unknown;
}

interface UseDownloadZipOptions {
	albumName?: string;
}

export const useDownloadZip = (options: UseDownloadZipOptions = {}) => {
	const downloadZip = async (
		images: Image[],
		selectedIds: Set<string>,
		onComplete?: () => void,
	) => {
		const selectedImages = images.filter((img) => selectedIds.has(img.imageId));

		if (selectedImages.length === 0) {
			toast.error("No images selected");
			return;
		}

		const toastId = toast.loading(
			`Preparing ZIP with ${selectedIds.size} photos...`,
		);

		try {
			const zip = new JSZip();
			const folder = zip.folder("photos");

			for (let i = 0; i < selectedImages.length; i++) {
				const image = selectedImages[i];
				const response = await fetch(image.imagePath);
				const blob = await response.blob();
				const fileName = `photo-${i + 1}-${String(image.imageId).slice(0, 8)}.jpg`;
				folder?.file(fileName, blob);

				if (i % 5 === 0) {
					toast.loading(`Zipping: ${i + 1}/${selectedImages.length}`, {
						id: toastId,
					});
				}
			}

			toast.loading("Generating ZIP file...", { id: toastId });
			const content = await zip.generateAsync({ type: "blob" });
			const url = window.URL.createObjectURL(content);
			const link = document.createElement("a");
			link.href = url;
			link.download = options.albumName
				? `${options.albumName}-photos.zip`
				: "downloaded-photos.zip";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			window.URL.revokeObjectURL(url);

			toast.success("Download started!", { id: toastId });
			onComplete?.();
		} catch (error) {
			console.error("ZIP Error:", error);
			toast.error("Failed to create ZIP. Please try again.", { id: toastId });
		}
	};

	return { downloadZip };
};
