import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Leaf, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate, useSearchParams } from 'react-router-dom'

// ── Decorative food-waste stat ────────────────────────────────
const STATS = [
	{ value: '40%', label: 'of food produced is wasted globally' },
	{ value: '1.3B', label: 'tonnes of food lost every year' },
	{ value: '8%', label: 'of greenhouse gases from food waste' },
]

export function LoginPage() {
	const { isAuthenticated, user } = useAuth()
	const navigate = useNavigate()
	const [searchParams] = useSearchParams()
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Show error if redirected back from backend with ?error=auth_failed
	useEffect(() => {
		if (searchParams.get('error') === 'auth_failed') {
			setError('Authentication failed. Please try again.')
		}
	}, [searchParams])

	// If already authenticated, redirect to the appropriate place
	if (isAuthenticated && user) {
		const role = user.role?.toLowerCase()
		if (!role) {
			navigate('/auth/select-role', { replace: true })
		} else if (!user.isOnboarded) {
			navigate(`/${role}/onboarding`, { replace: true })
		} else {
			navigate(`/${role}/dashboard`, { replace: true })
		}
		return null
	}

	async function handleSignIn(hint: 'sign-in' | 'sign-up' = 'sign-in') {
		setError(null)
		setIsLoading(true)
		try {
			const { data } = await authApi.getAuthorizeUrl(hint)
			window.location.href = data.authorization_url
		} catch {
			setError('Could not reach the server. Please try again.')
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-dvh bg-[var(--color-brand-primary)] flex flex-col md:flex-row overflow-hidden'>
			{/* ── Left panel — brand / stats ── */}
			<motion.div
				initial={{ opacity: 0, x: -32 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.5, ease: 'easeOut' }}
				className='hidden md:flex flex-col justify-between w-[46%] min-h-dvh bg-gradient-to-br from-[var(--color-brand-accent)] to-[#c94e00] px-12 py-10 text-white relative overflow-hidden'
			>
				{/* Background texture blobs */}
				<div className='absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/10 pointer-events-none' />
				<div className='absolute bottom-10 -left-16 w-56 h-56 rounded-full bg-white/8 pointer-events-none' />

				{/* Logo */}
				<div className='relative flex items-center gap-2.5'>
					<div className='w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center'>
						<Leaf size={18} className='text-white' />
					</div>
					<span className='font-[var(--font-display)] font-bold text-xl tracking-tight'>RePlate</span>
				</div>

				{/* Hero text */}
				<div className='relative space-y-5'>
					<h1 className='font-[var(--font-display)] font-extrabold text-4xl xl:text-5xl leading-[1.1]'>
						Rescue food.<br />Feed people.<br />Save the planet.
					</h1>
					<p className='text-white/75 text-base leading-relaxed max-w-sm'>
						Join thousands of sellers, NGOs, and consumers redistributing surplus food every day.
					</p>

					{/* Stats */}
					<div className='pt-4 space-y-4'>
						{STATS.map((s) => (
							<div key={s.value} className='flex items-center gap-3'>
								<span className='font-[var(--font-display)] font-bold text-2xl tabular-nums'>{s.value}</span>
								<span className='text-white/65 text-sm leading-snug max-w-[180px]'>{s.label}</span>
							</div>
						))}
					</div>
				</div>

				{/* Footer note */}
				<p className='relative text-white/40 text-xs'>
					Identity managed securely by WorkOS
				</p>
			</motion.div>

			{/* ── Right panel — sign-in card ── */}
			<div className='flex-1 flex items-center justify-center px-5 py-10 md:px-12'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
					className='w-full max-w-sm space-y-8'
				>
					{/* Mobile logo */}
					<div className='flex md:hidden items-center gap-2'>
						<div className='w-8 h-8 rounded-xl bg-[var(--color-brand-accent)] flex items-center justify-center'>
							<Leaf size={16} className='text-white' />
						</div>
						<span className='font-[var(--font-display)] font-bold text-lg text-[var(--color-text-primary)]'>RePlate</span>
					</div>

					{/* Heading */}
					<div className='space-y-1.5'>
						<h2 className='font-[var(--font-display)] font-bold text-2xl text-[var(--color-text-primary)]'>
							Welcome back
						</h2>
						<p className='text-sm text-[var(--color-text-muted)]'>
							Sign in to your account or create a new one.
						</p>
					</div>

					{/* Error banner */}
					{error && (
						<motion.div
							initial={{ opacity: 0, y: -8 }}
							animate={{ opacity: 1, y: 0 }}
							className='flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-red-200'
						>
							<AlertCircle size={15} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
							<p className='text-xs text-[var(--color-error)]'>{error}</p>
						</motion.div>
					)}

					{/* Primary CTA */}
					<div className='space-y-3'>
						<button
							onClick={() => handleSignIn('sign-in')}
							disabled={isLoading}
							className='w-full h-11 flex items-center justify-center gap-2.5 rounded-[var(--radius-full)] bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-accent-hover)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm'
						>
							{isLoading ? (
								<Loader2 size={16} className='animate-spin' />
							) : (
								<>
									Continue with WorkOS
									<ArrowRight size={15} />
								</>
							)}
						</button>

						<div className='flex items-center gap-3'>
							<div className='flex-1 h-px bg-[var(--color-border)]' />
							<span className='text-xs text-[var(--color-text-disabled)]'>or</span>
							<div className='flex-1 h-px bg-[var(--color-border)]' />
						</div>

						<button
							onClick={() => handleSignIn('sign-up')}
							disabled={isLoading}
							className='w-full h-11 flex items-center justify-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-primary)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed'
						>
							Create a new account
						</button>
					</div>

					{/* Fine print */}
					<p className='text-center text-[11px] text-[var(--color-text-disabled)] leading-relaxed'>
						By continuing you agree to our{' '}
						<span className='underline underline-offset-2 cursor-pointer hover:text-[var(--color-text-muted)] transition-colors'>Terms of Service</span>
						{' '}and{' '}
						<span className='underline underline-offset-2 cursor-pointer hover:text-[var(--color-text-muted)] transition-colors'>Privacy Policy</span>.
					</p>

					{/* Role hint cards */}
					<div className='pt-2 space-y-2'>
						<p className='text-[11px] uppercase tracking-widest text-[var(--color-text-disabled)] font-medium'>Who is RePlate for?</p>
						<div className='grid grid-cols-3 gap-2'>
							{[
								{ label: 'Consumers', emoji: '🛒', color: 'var(--color-brand-accent-light)' },
								{ label: 'Sellers', emoji: '🏪', color: 'var(--color-seller-accent-light)' },
								{ label: 'NGOs', emoji: '🤝', color: 'var(--color-ngo-accent-light)' },
							].map((r) => (
								<div
									key={r.label}
									style={{ backgroundColor: r.color }}
									className='flex flex-col items-center gap-1 py-2.5 rounded-[var(--radius-md)] text-center'
								>
									<span className='text-lg leading-none'>{r.emoji}</span>
									<span className='text-[10px] font-medium text-[var(--color-text-secondary)]'>{r.label}</span>
								</div>
							))}
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	)
}
