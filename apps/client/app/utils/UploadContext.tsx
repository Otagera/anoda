import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { get, set, del } from "idb-keyval";
import { uploadImages } from "./api";
import { useQueryClient } from "@tanstack/react-query";

export interface UploadTask {
	id: string;
	fileName: string;
	file: File;
	progress: number;
	status: "pending" | "uploading" | "completed" | "error" | "paused";
	error?: string;
	albumId: string;
}

interface UploadContextType {
	tasks: UploadTask[];
	addUploads: (files: FileList, albumId: string) => void;
	pauseUpload: (id: string) => void;
	resumeUpload: (id: string) => void;
	retryUpload: (id: string) => void;
	removeTask: (id: string) => void;
	isManagerOpen: boolean;
	setIsManagerOpen: (open: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const IDB_KEY = "facematch-upload-queue";

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [tasks, setTasks] = useState<UploadTask[]>([]);
	const [isManagerOpen, setIsManagerOpen] = useState(false);
	const queryClient = useQueryClient();

	// Load persisted tasks from IndexedDB on mount
	useEffect(() => {
		const loadTasks = async () => {
			const saved = await get<UploadTask[]>(IDB_KEY);
			if (saved) {
				// Status cleanup: reset uploading to pending on refresh
				const cleaned = saved.map(t => 
					t.status === "uploading" ? { ...t, status: "pending" as const, progress: 0 } : t
				);
				setTasks(cleaned);
			}
		};
		loadTasks();
	}, []);

	// Persist tasks to IndexedDB whenever they change
	useEffect(() => {
		// We don't want to save the actual File object in localStorage, 
		// but IndexedDB handles Blobs/Files perfectly.
		set(IDB_KEY, tasks);
	}, [tasks]);

	const addUploads = useCallback((files: FileList, albumId: string) => {
		const newTasks: UploadTask[] = Array.from(files).map((file) => ({
			id: Math.random().toString(36).substring(2, 11),
			fileName: file.name,
			file,
			progress: 0,
			status: "pending",
			albumId,
		}));
		setTasks((prev) => [...prev, ...newTasks]);
		setIsManagerOpen(true);
	}, []);

	const processNextTask = useCallback(async () => {
		const nextTask = tasks.find((t) => t.status === "pending");
		if (!nextTask) return;

		setTasks((prev) =>
			prev.map((t) => (t.id === nextTask.id ? { ...t, status: "uploading" } : t))
		);

		try {
			const formData = new FormData();
			formData.append("uploadedImages", nextTask.file);
			formData.append("albumId", nextTask.albumId);

			await uploadImages(formData);

			setTasks((prev) =>
				prev.map((t) =>
					t.id === nextTask.id ? { ...t, status: "completed", progress: 100 } : t
				)
			);
			
			queryClient.invalidateQueries({ queryKey: ["images", nextTask.albumId] });
		} catch (err: any) {
			setTasks((prev) =>
				prev.map((t) =>
					t.id === nextTask.id ? { ...t, status: "error", error: err.message } : t
				)
			);
		}
	}, [tasks, queryClient]);

	useEffect(() => {
		const activeUploads = tasks.filter((t) => t.status === "uploading").length;
		if (activeUploads < 2) { // Allow 2 concurrent uploads
			processNextTask();
		}
	}, [tasks, processNextTask]);

	const pauseUpload = (id: string) => {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "paused" } : t)));
	};

	const resumeUpload = (id: string) => {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "pending" } : t)));
	};

	const retryUpload = (id: string) => {
		setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: "pending", error: undefined } : t)));
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
	if (!context) throw new Error("useUpload must be used within an UploadProvider");
	return context;
};
