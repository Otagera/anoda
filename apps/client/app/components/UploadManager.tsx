import type React from "react";
import { type UploadTask, useUpload } from "../utils/UploadContext";

export const UploadManager: React.FC = () => {
	const {
		tasks,
		isManagerOpen,
		setIsManagerOpen,
		pauseUpload,
		resumeUpload,
		retryUpload,
		removeTask,
	} = useUpload();

	if (tasks.length === 0) return null;

	const completedCount = tasks.filter((t) => t.status === "completed").length;
	const activeCount = tasks.filter(
		(t) => t.status === "uploading" || t.status === "pending",
	).length;
	const errorCount = tasks.filter((t) => t.status === "error").length;

	return (
		<div
			className={`fixed bottom-4 right-4 z-[60] w-80 bg-white dark:bg-gray-800 shadow-2xl rounded-xl border border-gray-200 dark:border-gray-700 transition-all duration-300 ${isManagerOpen ? "max-h-[32rem]" : "max-h-14"}`}
		>
			{/* Header */}
			<div
				className="flex items-center justify-between p-4 cursor-pointer border-b border-gray-100 dark:border-gray-700"
				onClick={() => setIsManagerOpen(!isManagerOpen)}
			>
				<div className="flex items-center space-x-2">
					<div
						className={`w-2 h-2 rounded-full ${activeCount > 0 ? "bg-blue-500 animate-pulse" : "bg-green-500"}`}
					/>
					<span className="font-semibold text-sm text-gray-900 dark:text-white">
						{activeCount > 0
							? `Uploading ${activeCount} photos...`
							: "Uploads Complete"}
					</span>
				</div>
				<div className="flex items-center space-x-2">
					<span className="text-xs text-gray-500 dark:text-gray-400">
						{completedCount}/{tasks.length}
					</span>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className={`h-4 w-4 transition-transform ${isManagerOpen ? "rotate-180" : ""}`}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 15l7-7 7 7"
						/>
					</svg>
				</div>
			</div>

			{/* Task List */}
			{isManagerOpen && (
				<div className="p-2 overflow-y-auto max-h-[28rem] space-y-1">
					{tasks.map((task) => (
						<div
							key={task.id}
							className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg group"
						>
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-[140px]">
									{task.fileName}
								</span>
								<div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
									{task.status === "uploading" && (
										<button
											onClick={() => pauseUpload(task.id)}
											className="p-1 text-gray-500 hover:text-blue-600"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M10 9v6m4-6v6"
												/>
											</svg>
										</button>
									)}
									{task.status === "paused" && (
										<button
											onClick={() => resumeUpload(task.id)}
											className="p-1 text-gray-500 hover:text-green-600"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
												/>
											</svg>
										</button>
									)}
									{task.status === "error" && (
										<button
											onClick={() => retryUpload(task.id)}
											className="p-1 text-gray-500 hover:text-blue-600"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-4 w-4"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
												/>
											</svg>
										</button>
									)}
									<button
										onClick={() => removeTask(task.id)}
										className="p-1 text-gray-500 hover:text-red-600"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								</div>
							</div>

							{/* Status indicator */}
							<div className="flex items-center space-x-2">
								<div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
									<div
										className={`h-full transition-all duration-300 ${task.status === "error" ? "bg-red-500" : task.status === "completed" ? "bg-green-500" : "bg-blue-500"}`}
										style={{
											width: `${task.status === "completed" ? 100 : task.status === "uploading" ? 45 : 0}%`,
										}}
									/>
								</div>
								<span
									className={`text-[10px] uppercase font-bold ${task.status === "error" ? "text-red-500" : task.status === "completed" ? "text-green-500" : "text-blue-500"}`}
								>
									{task.status}
								</span>
							</div>
							{task.error && (
								<p
									className="text-[10px] text-red-500 mt-1 truncate"
									title={task.error}
								>
									{task.error}
								</p>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
};
