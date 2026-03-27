import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { Person } from "~/types";
import {
	createPerson,
	fetchPeople,
	updateFace,
	updatePerson,
} from "../utils/api";

interface TagPersonModalProps {
	faceId: number;
	currentPersonId?: string | null;
	currentPersonName?: string | null;
	onClose: () => void;
	onCloseAfterSelection: () => void;
}

const TagPersonModal = ({
	faceId,
	currentPersonId,
	currentPersonName,
	onClose,
	onCloseAfterSelection,
}: TagPersonModalProps) => {
	const queryClient = useQueryClient();
	const [newName, setNewName] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [isChanging, setIsChanging] = useState(false);

	const { data: peopleResponse, isLoading } = useQuery({
		queryKey: ["people"],
		queryFn: fetchPeople,
	});

	const people: Person[] = peopleResponse?.data || [];
	const currentPerson = people.find((p) => p.personId === currentPersonId);

	const tagMutation = useMutation({
		mutationFn: (personId: string | null) => updateFace(faceId, { personId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["image"] });
			queryClient.invalidateQueries({ queryKey: ["search"] });
			onCloseAfterSelection();
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
			queryClient.invalidateQueries({ queryKey: ["search"] });
			onCloseAfterSelection();
		},
	});

	const renamePersonMutation = useMutation({
		mutationFn: ({ personId, name }: { personId: string; name: string }) =>
			updatePerson(personId, name),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["people"] });
			queryClient.invalidateQueries({ queryKey: ["image"] });
			queryClient.invalidateQueries({ queryKey: ["search"] });
			setIsEditing(false);
			onCloseAfterSelection();
		},
	});

	const handleCreatePerson = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim()) {
			createAndTagMutation.mutate(newName.trim());
		}
	};

	const handleRenamePerson = (e: React.FormEvent) => {
		e.preventDefault();
		if (newName.trim() && currentPersonId) {
			renamePersonMutation.mutate({
				personId: currentPersonId,
				name: newName.trim(),
			});
		}
	};

	const showSelectExisting = !currentPersonId || isChanging;
	const showEditCurrent = currentPersonId && !isChanging && !isEditing;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
			<div className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
				<div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
					<h2 className="text-xl font-bold text-zinc-900 dark:text-white">
						{currentPersonId ? "Manage Person" : "Who is this?"}
					</h2>
					<button
						onClick={onClose}
						className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
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
					{showEditCurrent && (
						<div className="bg-sage/10 dark:bg-sage/20 rounded-2xl p-4 border border-sage/20">
							<div className="flex items-center justify-between mb-3">
								<span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
									Current Person
								</span>
								<button
									onClick={() => {
										setNewName(currentPersonName || "");
										setIsEditing(true);
									}}
									className="text-xs text-sage hover:text-sage/80 font-bold flex items-center gap-1"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-3 w-3"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
									</svg>
									Edit
								</button>
							</div>
							<p className="text-lg font-bold text-zinc-900 dark:text-white">
								{currentPersonName}
							</p>
							<button
								onClick={() => setIsChanging(true)}
								className="mt-3 text-sm text-sage hover:text-sage/80 font-medium"
							>
								Change to different person →
							</button>
						</div>
					)}

					{isEditing && currentPersonId && (
						<div className="bg-sage/10 dark:bg-sage/20 rounded-2xl p-4 border border-sage/20">
							<h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
								Rename Person
							</h3>
							<form onSubmit={handleRenamePerson} className="flex gap-2">
								<input
									type="text"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									placeholder="Enter new name"
									className="flex-1 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-sage outline-none text-zinc-900 dark:text-white"
								/>
								<button
									type="submit"
									disabled={renamePersonMutation.isPending || !newName.trim()}
									className="bg-sage hover:bg-sage/90 text-zinc-950 px-4 py-2 rounded-2xl font-bold disabled:opacity-50 transition-colors"
								>
									Save
								</button>
								<button
									type="button"
									onClick={() => setIsEditing(false)}
									className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3 py-2 rounded-2xl font-medium transition-colors"
								>
									Cancel
								</button>
							</form>
						</div>
					)}

					{(showSelectExisting || isChanging) && (
						<div>
							<h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
								{isChanging ? "Change to" : "Select existing person"}
							</h3>
							{isLoading ? (
								<div className="flex justify-center py-4">
									<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sage"></div>
								</div>
							) : people.length > 0 ? (
								<div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
									{people
										.filter((person) => person.personId !== currentPersonId)
										.map((person) => (
											<button
												key={person.personId}
												onClick={() => {
													tagMutation.mutate(person.personId);
													setIsChanging(false);
												}}
												className="w-full text-left px-4 py-3 rounded-2xl transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium border border-transparent"
											>
												{person.name}
											</button>
										))}
								</div>
							) : (
								<p className="text-sm text-zinc-400 italic">
									No other people added yet.
								</p>
							)}
							{isChanging && (
								<button
									onClick={() => setIsChanging(false)}
									className="mt-3 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
								>
									← Back to current person
								</button>
							)}
						</div>
					)}

					{!currentPersonId && (
						<div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
							<h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-wider">
								Add new person
							</h3>
							{!isCreating ? (
								<button
									type="button"
									onClick={() => setIsCreating(true)}
									className="w-full py-3 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:border-sage hover:text-sage transition-all flex items-center justify-center gap-2 font-medium"
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
										className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-sage outline-none text-zinc-900 dark:text-white"
									/>
									<button
										type="submit"
										disabled={createAndTagMutation.isPending || !newName.trim()}
										className="bg-sage hover:bg-sage/90 text-zinc-950 px-5 py-2 rounded-2xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-sage/20"
									>
										Add
									</button>
									<button
										type="button"
										onClick={() => setIsCreating(false)}
										className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-2xl font-medium transition-colors border border-transparent"
									>
										Cancel
									</button>
								</form>
							)}
						</div>
					)}

					{currentPersonId && (
						<div className="pt-2">
							<button
								onClick={() => tagMutation.mutate(null)}
								className="text-sm text-plum hover:text-plum/80 transition-colors flex items-center gap-1 font-medium"
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
