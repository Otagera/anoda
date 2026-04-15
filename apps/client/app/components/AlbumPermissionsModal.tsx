import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Shield, User, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { generateInvite } from "../utils/api";
import { Button } from "./standard/Button";
import { Heading } from "./standard/Heading";

interface AlbumPermissionsModalProps {
	albumId: string;
	members: any[];
	onClose: () => void;
}

export const AlbumPermissionsModal = ({
	albumId,
	members = [],
	onClose,
}: AlbumPermissionsModalProps) => {
	const queryClient = useQueryClient();
	const [selectedRole, setSelectedRole] = useState("VIEWER");
	const [generatedToken, setGeneratedToken] = useState<string | null>(null);

	const generateInviteMutation = useMutation({
		mutationFn: (role: string) => generateInvite(albumId, role),
		onSuccess: (data) => {
			setGeneratedToken(data.data.inviteToken);
			toast.success("Invite link generated!");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to generate invite");
		},
	});

	const copyInviteLink = () => {
		if (!generatedToken) return;
		const link = `${window.location.origin}/join/${generatedToken}`;
		navigator.clipboard.writeText(link);
		toast.success("Link copied to clipboard!");
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
			<div className="bg-white dark:bg-zinc-900 p-8 rounded-[2rem] shadow-2xl max-w-lg w-full border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in duration-300">
				<div className="flex justify-between items-start mb-6">
					<div>
						<Heading level={2}>Album Permissions</Heading>
						<p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 font-medium">
							Manage who has access to this album and their roles.
						</p>
					</div>
					<button
						onClick={onClose}
						className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
					>
						<X size={20} />
					</button>
				</div>

				<div className="space-y-6">
					{/* Generate Invite Section */}
					<div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
						<div className="flex items-center gap-2 mb-3">
							<Plus size={18} className="text-sage" />
							<p className="font-bold text-zinc-900 dark:text-white text-sm">
								Invite a Member
							</p>
						</div>

						{!generatedToken ? (
							<div className="space-y-4">
								<div className="flex gap-2">
									{["VIEWER", "CONTRIBUTOR", "ADMIN"].map((role) => (
										<button
											key={role}
											type="button"
											onClick={() => setSelectedRole(role)}
											className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
												selectedRole === role
													? "bg-sage border-sage text-zinc-950 shadow-lg shadow-sage/20"
													: "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
											}`}
										>
											{role}
										</button>
									))}
								</div>
								<Button
									className="w-full py-4 font-bold"
									onClick={() => generateInviteMutation.mutate(selectedRole)}
									disabled={generateInviteMutation.isPending}
								>
									{generateInviteMutation.isPending
										? "Generating..."
										: "Generate Invite Link"}
								</Button>
							</div>
						) : (
							<div className="space-y-3">
								<div className="flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
									<p className="text-xs font-mono text-zinc-500 truncate flex-1">
										{window.location.origin}/join/{generatedToken}
									</p>
									<button
										onClick={copyInviteLink}
										className="p-2 text-sage hover:bg-sage/10 rounded-lg transition-colors"
									>
										<Copy size={16} />
									</button>
								</div>
								<button
									onClick={() => setGeneratedToken(null)}
									className="text-xs text-sage hover:underline font-medium"
								>
									Generate another link
								</button>
							</div>
						)}
					</div>

					{/* Members List */}
					<div className="space-y-3">
						<p className="font-bold text-zinc-900 dark:text-white text-sm px-1">
							Current Members ({members.length})
						</p>
						<div className="max-h-[30vh] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
							{members.map((member) => (
								<div
									key={member.id}
									className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl"
								>
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-sage/10 flex items-center justify-center text-sage">
											<User size={16} />
										</div>
										<div>
											<p className="text-xs font-bold text-zinc-900 dark:text-white">
												{member.user?.email || "Pending Invite"}
											</p>
											<p className="text-[10px] text-zinc-500 font-medium">
												{member.user_id ? "Joined" : "Not yet joined"}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg">
										<Shield size={10} className="text-zinc-400" />
										<span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400">
											{member.role}
										</span>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="mt-8">
					<Button
						variant="ghost"
						onClick={onClose}
						className="w-full rounded-xl py-4 font-bold"
					>
						Done
					</Button>
				</div>
			</div>
		</div>
	);
};
