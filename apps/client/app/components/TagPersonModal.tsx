import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Person } from "../interface";
import { createPerson, fetchPeople, updateFace } from "../utils/api";

interface TagPersonModalProps {
	faceId: number;
	currentPersonId?: string | null;
	onClose: () => void;
}

const TagPersonModal = ({
	faceId,
	currentPersonId,
	onClose,
}: TagPersonModalProps) => {
	const queryClient = useQueryClient();
	const [newName, setNewName] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	const { data: peopleResponse, isLoading } = useQuery({
		queryKey: ["people"],
		queryFn: fetchPeople,
	});

	const people: Person[] = peopleResponse?.data || [];

	const tagMutation = useMutation({
		mutationFn: (personId: string | null) => updateFace(faceId, { personId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["image"] });
			onClose();
		},
	});

	const createAndTagMutation = useMutation({
		mutationFn: async (name: string) => {
			const personRes = await createPerson(name);
			return updateFace(faceId, { personId: personRes.data.personId });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["image"] });
			queryClient.invalidateQueries({ queryKey: ["people"] });
			onClose();
		},
	});

	const handleCreatePerson = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim()) {
			createAndTagMutation.mutate(newName.trim());
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700">
				<div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
					<h2 className="text-xl font-bold text-gray-900 dark:text-white">
						Who is this?
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-6 w-6"
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

				<div className="p-6 space-y-6">
					<div>
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
							Select existing person
						</h3>
						{isLoading ? (
							<div className="flex justify-center py-4">
								<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
							</div>
						) : people.length > 0 ? (
							<div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
								{people.map((person) => (
									<button
										key={person.personId}
										onClick={() => tagMutation.mutate(person.personId)}
										className={`w-full text-left px-4 py-2 rounded-lg transition-colors flex items-center justify-between ${
											currentPersonId === person.personId
												? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
												: "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-transparent"
										}`}
									>
										<span>{person.name}</span>
										{currentPersonId === person.personId && (
											<svg
												xmlns="http://www.w3.org/2000/svg"
												className="h-5 w-5"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fillRule="evenodd"
													d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
													clipRule="evenodd"
												/>
											</svg>
										)}
									</button>
								))}
							</div>
						) : (
							<p className="text-sm text-gray-400 italic">
								No people added yet.
							</p>
						)}
					</div>

					<div className="pt-4 border-t border-gray-100 dark:border-gray-700">
						<h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
							Add new person
						</h3>
						{!isCreating ? (
							<button
								onClick={() => setIsCreating(true)}
								className="w-full py-2 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-5 w-5"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
										clipRule="evenodd"
									/>
								</svg>
								New Person
							</button>
						) : (
							<form onSubmit={handleCreatePerson} className="flex gap-2">
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Enter name"
									className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
								/>
								<button
									type="submit"
									disabled={createAndTagMutation.isPending || !newName.trim()}
									className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
								>
									Add
								</button>
								<button
									type="button"
									onClick={() => setIsCreating(false)}
									className="bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg transition-colors"
								>
									Cancel
								</button>
							</form>
						)}
					</div>

					{currentPersonId && (
						<div className="pt-2">
							<button
								onClick={() => tagMutation.mutate(null)}
								className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
										clipRule="evenodd"
									/>
								</svg>
								Remove tag
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default TagPersonModal;
