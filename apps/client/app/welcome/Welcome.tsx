import { ArrowRight, CheckCircle2, Search, Shield, Sparkles } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../utils/auth";

const Welcome = () => {
	const { isAuthenticated, isInitialized } = useAuth();

	if (isInitialized && isAuthenticated) {
		return <Navigate to="/home" replace />;
	}

	const features = [
		{
			icon: <Search className="h-5 w-5" />,
			title: "AI Face Search",
			description:
				"Find people across thousands of photos in seconds with face matching.",
		},
		{
			icon: <Shield className="h-5 w-5" />,
			title: "Private by Design",
			description:
				"Your albums stay organized in your account with role-based sharing controls.",
		},
		{
			icon: <Sparkles className="h-5 w-5" />,
			title: "Smart Workflows",
			description:
				"Upload once, organize faster, and review recent activity from one place.",
		},
	];

	return (
		<div className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
			<div className="absolute inset-0 pointer-events-none">
				<div className="absolute -top-[18%] left-[10%] h-96 w-96 rounded-full bg-sage/20 blur-[130px]" />
				<div className="absolute top-[20%] -right-[10%] h-96 w-96 rounded-full bg-plum/15 blur-[130px]" />
				<div className="absolute -bottom-[18%] left-[35%] h-96 w-96 rounded-full bg-terracotta/20 blur-[130px]" />
			</div>

			<div className="relative mx-auto flex w-full max-w-6xl flex-col gap-14 px-6 py-14 sm:px-10 lg:py-20">
				<section className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
					<div className="space-y-8">
						<div className="inline-flex items-center gap-2 rounded-full border border-sage/30 bg-sage/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-sage">
							New redesigned experience
						</div>
						<div className="space-y-5">
							<h1 className="text-5xl font-black tracking-tight text-zinc-900 dark:text-white sm:text-6xl">
								Smarter photo organization with{" "}
								<span className="text-sage">face search</span>.
							</h1>
							<p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-300">
								Anoda Facematch helps teams upload event photos, group them into
								albums, and instantly find people using AI-powered face matching.
								No more scrolling through hundreds of images manually.
							</p>
						</div>
						<div className="flex flex-wrap items-center gap-4">
							<Link
								to="/signup"
								className="btn-primary inline-flex items-center gap-2 px-7 py-4 text-sm uppercase tracking-wide"
							>
								Create free account <ArrowRight className="h-4 w-4" />
							</Link>
							<Link
								to="/login"
								className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/70 px-7 py-4 text-sm font-semibold text-zinc-700 transition-colors hover:border-sage hover:text-sage dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-200"
							>
								Sign in
							</Link>
						</div>
						<div className="flex flex-wrap gap-5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-sage" />
								Quick album creation
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-sage" />
								Secure private library
							</div>
							<div className="flex items-center gap-2">
								<CheckCircle2 className="h-4 w-4 text-sage" />
								Fast face discovery
							</div>
						</div>
					</div>

					<div className="glass-panel rounded-[2rem] border border-zinc-200/80 p-8 dark:border-zinc-800/80">
						<p className="mb-6 text-sm font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
							How it works
						</p>
						<ol className="space-y-5">
							{[
								"Create an account and your first album.",
								"Upload images from events, shoots, or team folders.",
								"Use face search to instantly locate people.",
								"Share selected albums securely when needed.",
							].map((step, index) => (
								<li key={step} className="flex items-start gap-3">
									<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-plum/10 text-xs font-black text-plum">
										{index + 1}
									</div>
									<span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
										{step}
									</span>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					{features.map((feature) => (
						<article
							key={feature.title}
							className="glass-panel rounded-3xl border border-zinc-200/80 p-6 dark:border-zinc-800/80"
						>
							<div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sage/15 text-sage">
								{feature.icon}
							</div>
							<h2 className="text-lg font-bold text-zinc-900 dark:text-white">
								{feature.title}
							</h2>
							<p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
								{feature.description}
							</p>
						</article>
					))}
				</section>
			</div>
		</div>
	);
};

export default Welcome;
