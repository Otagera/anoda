import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { get, set } from "idb-keyval";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	getPresignedUrl,
	getPublicPresignedUrl,
	uploadGuestImages,
	uploadImages,
} from "./api";

export interface UploadTask {
	id: string;
	fileName: string;
	file: File;
	progress: number;
	status: "pending" | "uploading" | "completed" | "error" | "paused";
	error?: string;
	albumId: string;
	initialStatus?: "PENDING" | "APPROVED";
	shareToken?: string; // If present, it's a guest upload
}

interface UploadContextType {
	tasks: UploadTask[];
	addUploads: (
		files: FileList,
		albumId: string,
		initialStatus?: "PENDING" | "APPROVED",
		shareToken?: string,
	) => void;
	pauseUpload: (id: string) => void;
	resumeUpload: (id: string) => void;
	retryUpload: (id: string) => void;
	removeTask: (id: string) => void;
	isManagerOpen: boolean;
	setIsManagerOpen: (open: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const IDB_KEY = "facematch-upload-queue";

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [tasks, setTasks] = useState<UploadTask[]>([]);
	const [isManagerOpen, setIsManagerOpen] = useState(false);
	const queryClient = useQueryClient();
	const abortControllers = useRef<Map<string, AbortController>>(new Map());
	const processingRef = useRef(false);

	// Load persisted tasks from IndexedDB on mount
	useEffect(() => {
		const loadTasks = async () => {
			const saved = await get<UploadTask[]>(IDB_KEY);
			if (saved) {
				// Status cleanup: reset uploading to pending on refresh
				const cleaned = saved.map((t) =>
					t.status === "uploading"
						? { ...t, status: "pending" as const, progress: 0 }
						: t,
				);
				setTasks(cleaned);
			}
		};
		loadTasks();
	}, []);

	// Persist tasks to IndexedDB whenever they change
	useEffect(() => {
		set(IDB_KEY, tasks);
	}, [tasks]);

	const addUploads = useCallback(
		(
			files: FileList,
			albumId: string,
			initialStatus?: "PENDING" | "APPROVED",
			shareToken?: string,
		) => {
			const newTasks: UploadTask[] = Array.from(files).map((file) => ({
				id: Math.random().toString(36).substring(2, 11),
				fileName: file.name,
				file,
				progress: 0,
				status: "pending",
				albumId,
				initialStatus,
				shareToken,
			}));
			setTasks((prev) => [...prev, ...newTasks]);
			setIsManagerOpen(true);
		},
		[],
	);

	const processNextTask = useCallback(async () => {
		if (processingRef.current) return;
		processingRef.current = true;

		const nextTask = tasks.find((t) => t.status === "pending");
		if (!nextTask) {
			processingRef.current = false;
			return;
		}

		setTasks((prev) =>
			prev.map((t) =>
				t.id === nextTask.id ? { ...t, status: "uploading" } : t,
			),
		);

		const controller = new AbortController();
		abortControllers.current.set(nextTask.id, controller);

		try {
			let presignedData;

			// 1. Get Presigned URL (Authenticated or Public)
			if (nextTask.shareToken) {
				const res = await getPublicPresignedUrl(nextTask.shareToken, {
					fileName: nextTask.fileName,
					contentType: nextTask.file.type,
				});
				presignedData = res.data;
			} else {
				const res = await getPresignedUrl({
					fileName: nextTask.fileName,
					contentType: nextTask.file.type,
					albumId: nextTask.albumId,
				});
				presignedData = res.data;
			}

			// 2. Upload directly to Cloud (R2/S3/Local Direct)
			await axios.put(presignedData.uploadUrl, nextTask.file, {
				signal: controller.signal,
				headers: {
					"Content-Type": nextTask.file.type,
				},
				onUploadProgress: (progressEvent) => {
					const progress = Math.round(
						(progressEvent.loaded * 100) / (progressEvent.total || 1),
					);
					setTasks((prev) =>
						prev.map((t) => (t.id === nextTask.id ? { ...t, progress } : t)),
					);
				},
			});

			// 3. Notify backend to process the uploaded file
			const formData = new FormData();
			formData.append("key", presignedData.key);
			formData.append("albumId", nextTask.albumId);
			formData.append(
				"storageProvider",
				presignedData.storageProvider || "local",
			);
			if (nextTask.initialStatus) {
				formData.append("status", nextTask.initialStatus);
			}

			if (nextTask.shareToken) {
				await uploadGuestImages(nextTask.shareToken, formData);
				queryClient.invalidateQueries({
					queryKey: ["shared-album", nextTask.shareToken],
				});
			} else {
				await uploadImages(formData);
				queryClient.invalidateQueries({
					queryKey: ["images", nextTask.albumId],
				});
				queryClient.invalidateQueries({ queryKey: ["settings"] });
				queryClient.invalidateQueries({ queryKey: ["usage"] });
			}

			setTasks((prev) =>
				prev.map((t) =>
					t.id === nextTask.id
						? { ...t, status: "completed", progress: 100 }
						: t,
				),
			);
		} catch (err: any) {
			if (axios.isCancel(err)) {
				console.log("Upload cancelled:", nextTask.fileName);
				return;
			}
			setTasks((prev) =>
				prev.map((t) =>
					t.id === nextTask.id
						? { ...t, status: "error", error: err.message }
						: t,
				),
			);
		} finally {
			abortControllers.current.delete(nextTask.id);
			processingRef.current = false;
		}
	}, [tasks, queryClient]);

	useEffect(() => {
		const activeUploads = tasks.filter((t) => t.status === "uploading").length;
		if (activeUploads < 2) {
			processNextTask();
		}
	}, [tasks, processNextTask]);

	const pauseUpload = (id: string) => {
		const controller = abortControllers.current.get(id);
		if (controller) {
			controller.abort();
			abortControllers.current.delete(id);
		}
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, status: "paused" } : t)),
		);
	};

	const resumeUpload = (id: string) => {
		setTasks((prev) =>
			prev.map((t) => (t.id === id ? { ...t, status: "pending" } : t)),
		);
	};

	const retryUpload = (id: string) => {
		setTasks((prev) =>
			prev.map((t) =>
				t.id === id ? { ...t, status: "pending", error: undefined } : t,
			),
		);
	};

	const removeTask = (id: string) => {
		setTasks((prev) => prev.filter((t) => t.id !== id));
	};

	return (
		<UploadContext.Provider
			value={{
				tasks,
				addUploads,
				pauseUpload,
				resumeUpload,
				retryUpload,
				removeTask,
				isManagerOpen,
				setIsManagerOpen,
			}}
		>
			{children}
		</UploadContext.Provider>
	);
};

export const useUpload = () => {
	const context = useContext(UploadContext);
	if (!context)
		throw new Error("useUpload must be used within an UploadProvider");
	return context;
};
