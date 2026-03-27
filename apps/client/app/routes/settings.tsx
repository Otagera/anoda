import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, HardDrive, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { MainContainer } from "~/components/MainContainer";
import { Button } from "~/components/standard/Button";
import { Card } from "~/components/standard/Card";
import { Heading } from "~/components/standard/Heading";
import {
	createStorageConfig,
	deleteStorageConfig,
	fetchSettings,
	updateStorageConfig,
} from "../utils/api";

const Settings = () => {
	const queryClient = useQueryClient();
	const { data: settingsData, isLoading } = useQuery({
		queryKey: ["settings"],
		queryFn: fetchSettings,
	});

	const [isFormOpen, setIsFormOpen] = useState(false);
	const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: "",
		provider: "r2",
		bucket: "",
		endpoint: "",
		accessKeyId: "",
		secretAccessKey: "",
		region: "auto",
	});

	const resetForm = () => {
		setFormData({
			name: "",
			provider: "r2",
			bucket: "",
			endpoint: "",
			accessKeyId: "",
			secretAccessKey: "",
			region: "auto",
		});
		setEditingConfigId(null);
		setIsFormOpen(false);
	};

	const addMutation = useMutation({
		mutationFn: createStorageConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			resetForm();
			toast.success("Storage configuration added successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to add storage configuration");
		},
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, data }: { id: string; data: any }) =>
			updateStorageConfig(id, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			resetForm();
			toast.success("Storage configuration updated successfully");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to update storage configuration");
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteStorageConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["settings"] });
			toast.success("Storage configuration deleted");
		},
		onError: (error: any) => {
			toast.error(error.message || "Failed to delete storage configuration");
		},
	});

	const handleEdit = (config: any) => {
		setFormData({
			name: config.name,
			provider: config.provider,
			bucket: config.bucket,
			endpoint: config.endpoint,
			accessKeyId: "", // Don't populate sensitive data
			secretAccessKey: "",
			region: config.region || "auto",
		});
		setEditingConfigId(config.id);
		setIsFormOpen(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (editingConfigId) {
			const { accessKeyId, secretAccessKey, ...rest } = formData;
			const dataToSave: any = { ...rest };
			if (accessKeyId) dataToSave.accessKeyId = accessKeyId;
			if (secretAccessKey) dataToSave.secretAccessKey = secretAccessKey;
			updateMutation.mutate({ id: editingConfigId, data: dataToSave });
		} else {
			addMutation.mutate(formData);
		}
	};

	if (isLoading) {
		return (
			<MainContainer>
				<div className="flex justify-center py-20">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
				</div>
			</MainContainer>
		);
	}

	return (
		<MainContainer className="max-w-4xl mx-auto space-y-12 pb-20">
			<div>
				<Heading
					level={1}
					className="text-4xl md:text-5xl font-black tracking-tight"
				>
					Settings
				</Heading>
				<p className="text-zinc-500 dark:text-zinc-400 mt-3 text-lg font-medium">
					Manage your account preferences and storage configurations.
				</p>
			</div>

			{/* Profile Section */}
			<section className="space-y-6">
				<Heading level={2} className="text-2xl font-bold">
					Account
				</Heading>
				<Card className="p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-zinc-200 dark:border-zinc-800">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-1">
								Email Address
							</p>
							<p className="text-xl font-bold text-zinc-900 dark:text-white">
								{settingsData?.data?.email}
							</p>
						</div>
						<Button
							variant="outline"
							size="sm"
							disabled
							className="rounded-xl font-bold opacity-50"
						>
							Change Email
						</Button>
					</div>
				</Card>
			</section>

			{/* Storage / BYOS Section */}
			<section className="space-y-6">
				<div className="flex justify-between items-end">
					<div>
						<Heading level={2} className="text-2xl font-bold">
							Storage (BYOS)
						</Heading>
						<p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
							Connect your own S3-compatible storage to own your files.
						</p>
					</div>
					{!isFormOpen && (
						<Button
							onClick={() => setIsFormOpen(true)}
							className="rounded-xl font-bold py-4 px-4"
						>
							<Plus size={20} className="mr-2" /> Add Storage
						</Button>
					)}
				</div>

				{isFormOpen && (
					<Card className="p-10 border-indigo-500/30 bg-indigo-500/5 backdrop-blur-xl rounded-[2.5rem]">
						<form onSubmit={handleSubmit} className="space-y-8">
							<div className="flex justify-between items-center mb-2">
								<Heading level={3} className="text-xl font-bold">
									{editingConfigId
										? "Edit Storage"
										: "New Storage Configuration"}
								</Heading>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Config Name
									</label>
									<input
										type="text"
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
										placeholder="e.g. My R2 Bucket"
										value={formData.name}
										onChange={(e) =>
											setFormData({ ...formData, name: e.target.value })
										}
										required
									/>
								</div>
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Provider
									</label>
									<select
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold"
										value={formData.provider}
										onChange={(e) =>
											setFormData({ ...formData, provider: e.target.value })
										}
									>
										<option value="r2">Cloudflare R2</option>
										<option value="s3">AWS S3</option>
									</select>
								</div>
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Bucket Name
									</label>
									<input
										type="text"
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
										value={formData.bucket}
										onChange={(e) =>
											setFormData({ ...formData, bucket: e.target.value })
										}
										required
									/>
								</div>
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Endpoint
									</label>
									<input
										type="text"
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
										placeholder="https://<id>.r2.cloudflarestorage.com"
										value={formData.endpoint}
										onChange={(e) =>
											setFormData({ ...formData, endpoint: e.target.value })
										}
										required
									/>
								</div>
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Access Key ID {editingConfigId && "(Optional if unchanged)"}
									</label>
									<input
										type="password"
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
										value={formData.accessKeyId}
										onChange={(e) =>
											setFormData({ ...formData, accessKeyId: e.target.value })
										}
										required={!editingConfigId}
									/>
								</div>
								<div className="space-y-3">
									<label className="text-xs font-black uppercase tracking-widest text-zinc-500">
										Secret Access Key{" "}
										{editingConfigId && "(Optional if unchanged)"}
									</label>
									<input
										type="password"
										className="w-full px-6 py-4 rounded-2xl border bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
										value={formData.secretAccessKey}
										onChange={(e) =>
											setFormData({
												...formData,
												secretAccessKey: e.target.value,
											})
										}
										required={!editingConfigId}
									/>
								</div>
							</div>
							<div className="flex gap-4 justify-end pt-4">
								<Button
									variant="ghost"
									type="button"
									onClick={resetForm}
									className="rounded-xl font-bold"
								>
									Cancel
								</Button>
								<Button
									type="submit"
									disabled={addMutation.isPending || updateMutation.isPending}
									className="rounded-xl font-bold px-8"
								>
									{addMutation.isPending || updateMutation.isPending
										? "Saving..."
										: editingConfigId
											? "Update Configuration"
											: "Create Configuration"}
								</Button>
							</div>
						</form>
					</Card>
				)}

				<div className="grid gap-6">
					{settingsData?.data?.storageConfigs?.map((config: any) => (
						<Card
							key={config.id}
							className="p-8 flex items-center justify-between group hover:border-indigo-500/50 transition-all rounded-[2rem] bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-sm"
						>
							<div className="flex items-center gap-6">
								<div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
									<HardDrive size={28} />
								</div>
								<div>
									<p className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
										{config.name}
									</p>
									<p className="text-sm text-zinc-500 font-bold mt-0.5">
										{config.bucket} • {config.provider.toUpperCase()}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<button
									onClick={() => handleEdit(config)}
									className="p-3 text-zinc-400 hover:text-indigo-500 hover:bg-indigo-500/10 rounded-xl transition-all"
									title="Edit"
								>
									<Edit2 size={20} />
								</button>
								<button
									onClick={() => {
										if (confirm("Delete this storage configuration?")) {
											deleteMutation.mutate(config.id);
										}
									}}
									className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
									title="Delete"
								>
									<Trash2 size={20} />
								</button>
							</div>
						</Card>
					))}

					{(!settingsData?.data?.storageConfigs ||
						settingsData.data.storageConfigs.length === 0) &&
						!isFormOpen && (
							<div className="text-center py-20 border-2 border-dashed rounded-[3rem] border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
								<div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto mb-6 text-zinc-400">
									<HardDrive size={32} />
								</div>
								<p className="text-xl font-bold text-zinc-500">
									No external storage connected.
								</p>
								<p className="text-sm text-zinc-400 mt-2 font-medium">
									Managed Cloudflare R2 storage is being used by default.
								</p>
							</div>
						)}
				</div>
			</section>
		</MainContainer>
	);
};

export default Settings;
