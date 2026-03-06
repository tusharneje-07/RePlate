import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	ShoppingBag,
	Store,
	HeartHandshake,
	ArrowRight,
	Loader2,
	AlertCircle,
	CheckCircle2,
	Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/lib/api'

// ── Role definitions ──────────────────────────────────────────
type SelectableRole = 'CONSUMER' | 'SELLER' | 'NGO'

interface RoleOption {
	id: SelectableRole
	label: string
	subtitle: string
	description: string
	icon: React.ElementType
	accentColor: string
	bgColor: string
	borderColor: string
	textColor: string
	perks: string[]
}

const ROLES: RoleOption[] = [
	{
		id: 'CONSUMER',
		label: 'Consumer',
		subtitle: 'Save food & money',
		description: 'Discover surplus food from local sellers at steep discounts. Every rescue reduces waste.',
		icon: ShoppingBag,
		accentColor: 'var(--color-brand-accent)',
		bgColor: 'var(--color-brand-accent-light)',
		borderColor: 'var(--color-brand-accent)',
		textColor: 'var(--color-brand-accent)',
		perks: ['Browse discounted surplus food nearby', 'Track your CO₂ & savings impact', 'Support local businesses'],
	},
	{
		id: 'SELLER',
		label: 'Seller',
		subtitle: 'Reduce waste, earn more',
		description: 'List surplus inventory and connect with buyers and NGOs. Turn food waste into revenue.',
		icon: Store,
		accentColor: 'var(--color-seller-accent)',
		bgColor: 'var(--color-seller-accent-light)',
		borderColor: 'var(--color-seller-accent)',
		textColor: 'var(--color-seller-accent)',
		perks: ['AI-powered dynamic pricing', 'Real-time order management', 'Sustainability reports'],
	},
	{
		id: 'NGO',
		label: 'NGO',
		subtitle: 'Feed communities',
		description: 'Claim donations and coordinate pickups to redistribute food to those who need it most.',
		icon: HeartHandshake,
		accentColor: 'var(--color-ngo-accent)',
		bgColor: 'var(--color-ngo-accent-light)',
		borderColor: 'var(--color-ngo-accent)',
		textColor: 'var(--color-ngo-accent)',
		perks: ['AI-optimised pickup routing', 'Donation discovery map', 'Impact tracking & reports'],
	},
]

export function SelectRolePage() {
	const { user, isAuthenticated, refreshToken } = useAuth()
	const navigate = useNavigate()
	const [selected, setSelected] = useState<SelectableRole | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// If user already has a role, redirect them to the right place
	if (isAuthenticated && user?.role) {
		const role = user.role.toLowerCase()
		if (!user.isOnboarded) {
			navigate(`/${role}/onboarding`, { replace: true })
		} else {
			navigate(`/${role}/dashboard`, { replace: true })
		}
		return null
	}

	// If not authenticated at all, redirect to login
	if (!isAuthenticated && !user) {
		navigate('/auth/login', { replace: true })
		return null
	}

	const selectedRole = ROLES.find((r) => r.id === selected)

	async function handleConfirm() {
		if (!selected) return
		setError(null)
		setIsLoading(true)
		try {
			const { data } = await authApi.assignRole(selected)
			await refreshToken(data.access_token)

			// Redirect to onboarding for the chosen role
			if (selected === 'CONSUMER') {
				navigate('/consumer/onboarding', { replace: true })
			} else if (selected === 'SELLER') {
				navigate('/seller/onboarding', { replace: true })
			} else {
				navigate('/ngo/onboarding', { replace: true })
			}
		} catch {
			setError('Could not assign role. Please try again.')
			setIsLoading(false)
		}
	}

	return (
		<div className='min-h-dvh bg-[var(--color-surface-elevated)] flex flex-col'>
			{/* ── Top bar ── */}
			<header className='sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--color-border)]'>
				<div className='max-w-2xl mx-auto px-5 py-3.5 flex items-center gap-2.5'>
					<div className='w-8 h-8 rounded-xl bg-[var(--color-brand-accent)] flex items-center justify-center'>
						<Leaf size={15} className='text-white' />
					</div>
					<span className='font-[var(--font-display)] font-bold text-base text-[var(--color-text-primary)]'>RePlate</span>
				</div>
			</header>

			{/* ── Main ── */}
			<main className='flex-1 max-w-2xl mx-auto w-full px-5 py-8'>
				{/* Greeting */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
					className='mb-7 space-y-1'
				>
					<h1 className='font-[var(--font-display)] font-bold text-2xl text-[var(--color-text-primary)]'>
						How will you use RePlate?
					</h1>
					<p className='text-sm text-[var(--color-text-muted)]'>
						Choose one role. You can always contact us if you need to change it.
					</p>
				</motion.div>

				{/* Error */}
				{error && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						className='flex items-start gap-2.5 p-3 mb-4 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-red-200'
					>
						<AlertCircle size={15} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
						<p className='text-xs text-[var(--color-error)]'>{error}</p>
					</motion.div>
				)}

				{/* Role cards */}
				<div className='space-y-3'>
					{ROLES.map((role, i) => {
						const Icon = role.icon
						const isActive = selected === role.id
						return (
							<motion.button
								key={role.id}
								initial={{ opacity: 0, y: 16 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: i * 0.07 }}
								onClick={() => setSelected(role.id)}
								className={cn(
									'w-full text-left rounded-[var(--radius-xl)] border-2 p-5 transition-all duration-200 focus:outline-none',
									isActive
										? 'shadow-[var(--shadow-elevated)]'
										: 'border-[var(--color-border)] bg-white hover:border-[var(--color-border)] hover:shadow-[var(--shadow-card)]',
								)}
								style={
									isActive
										? {
												borderColor: role.borderColor,
												backgroundColor: role.bgColor,
											}
										: undefined
								}
							>
								<div className='flex items-start gap-4'>
									{/* Icon */}
									<div
										className='w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors'
										style={{
											backgroundColor: isActive ? role.accentColor : 'var(--color-surface-elevated)',
										}}
									>
										<Icon
											size={20}
											style={{ color: isActive ? 'white' : role.accentColor }}
										/>
									</div>

									{/* Text */}
									<div className='flex-1 min-w-0'>
										<div className='flex items-center justify-between gap-2'>
											<div>
												<span
													className='font-[var(--font-display)] font-bold text-base'
													style={{ color: isActive ? role.accentColor : 'var(--color-text-primary)' }}
												>
													{role.label}
												</span>
												<span className='ml-2 text-xs text-[var(--color-text-muted)]'>{role.subtitle}</span>
											</div>
											{isActive && (
												<CheckCircle2
													size={18}
													style={{ color: role.accentColor }}
													className='flex-shrink-0'
												/>
											)}
										</div>

										<p className='mt-1 text-sm text-[var(--color-text-secondary)] leading-relaxed'>
											{role.description}
										</p>

										{/* Perks — shown only when selected */}
										<AnimatePresence>
											{isActive && (
												<motion.ul
													initial={{ opacity: 0, height: 0 }}
													animate={{ opacity: 1, height: 'auto' }}
													exit={{ opacity: 0, height: 0 }}
													transition={{ duration: 0.2 }}
													className='mt-3 space-y-1.5 overflow-hidden'
												>
													{role.perks.map((perk) => (
														<li key={perk} className='flex items-center gap-2 text-xs text-[var(--color-text-secondary)]'>
															<div
																className='w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0'
																style={{ backgroundColor: `${role.accentColor}20` }}
															>
																<CheckCircle2 size={10} style={{ color: role.accentColor }} />
															</div>
															{perk}
														</li>
													))}
												</motion.ul>
											)}
										</AnimatePresence>
									</div>
								</div>
							</motion.button>
						)
					})}
				</div>

				{/* Confirm button */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className='mt-6'
				>
					<button
						onClick={handleConfirm}
						disabled={!selected || isLoading}
						className={cn(
							'w-full h-12 flex items-center justify-center gap-2.5 rounded-[var(--radius-full)] text-sm font-semibold transition-all shadow-sm',
							'disabled:opacity-50 disabled:cursor-not-allowed',
							selected ? 'text-white active:scale-[0.98]' : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-disabled)] border border-[var(--color-border)]',
						)}
						style={
							selected && selectedRole
								? { backgroundColor: selectedRole.accentColor }
								: undefined
						}
					>
						{isLoading ? (
							<Loader2 size={16} className='animate-spin' />
						) : (
							<>
								{selected ? `Continue as ${selectedRole?.label}` : 'Select a role to continue'}
								{selected && <ArrowRight size={15} />}
							</>
						)}
					</button>
				</motion.div>
			</main>
		</div>
	)
}
