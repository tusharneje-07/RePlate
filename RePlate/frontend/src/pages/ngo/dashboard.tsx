import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	TrendingUp,
	TrendingDown,
	ArrowRight,
	HeartHandshake,
	Leaf,
	Wind,
	Clock,
	CheckCircle2,
	Sparkles,
	ChevronRight,
	MapPin,
	Search,
	Truck,
	LineChart,
	Building2,
	Sun,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { useNGOStore } from '@/stores/ngo-store'
import { cn } from '@/lib/utils'

// ── Helper: format large numbers ────────────────────────────
function formatCompact(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
	return String(n)
}

function getGreeting(): string {
	const h = new Date().getHours()
	if (h < 12) return 'Good morning'
	if (h < 17) return 'Good afternoon'
	return 'Good evening'
}

// ── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
	icon: React.ReactNode
	label: string
	value: string
	change?: number
	changeLabel?: string
	iconBg: string
	iconColor: string
}

function StatCard({ icon, label, value, change, changeLabel, iconBg, iconColor }: StatCardProps) {
	const isPositive = change !== undefined && change >= 0

	return (
		<motion.div variants={fadeIn} className='h-full'>
			<Card className='h-full flex flex-col overflow-hidden border-[var(--color-ngo-border)] bg-[var(--color-ngo-surface-card)] shadow-none hover:shadow-md transition-shadow duration-200'>
				<CardContent className='p-4 flex flex-col h-full'>
					<div className='flex items-start justify-between gap-2 mb-3'>
						<div
							className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', iconBg)}
						>
							<span className={iconColor}>{icon}</span>
						</div>
						{change !== undefined && (
							<div
								className={cn(
									'flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
									isPositive
										? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
										: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
								)}
							>
								{isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
								{Math.abs(change)}%
							</div>
						)}
					</div>
					<div className='mt-auto'>
						<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)] leading-tight'>
							{value}
						</p>
						<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>{label}</p>
						<div className='min-h-[14px] mt-1'>
							{changeLabel && (
								<p className='text-[10px] text-[var(--color-ngo-text-disabled)]'>{changeLabel}</p>
							)}
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ── Active Pickups Queue ──────────────────────────────────────
function ActivePickups() {
	const { pickups } = useNGOStore()
	const activePickups = pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled')

	const sorted = [...activePickups].sort((a, b) => new Date(a.donation.expiresAt).getTime() - new Date(b.donation.expiresAt).getTime())

	return (
		<Card className='border-[var(--color-ngo-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<Truck size={16} className='text-[var(--color-ngo-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
							Active Pickups
						</h3>
						{activePickups.length > 0 && (
							<span className='w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-ngo-accent)] text-white text-[10px] font-bold'>
								{activePickups.length}
							</span>
						)}
					</div>
					<Link
						to='/ngo/pickups'
						className='text-xs text-[var(--color-ngo-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						Manage queue <ArrowRight size={12} />
					</Link>
				</div>

				{activePickups.length === 0 ? (
					<div className='flex flex-col items-center gap-2 py-6 text-center bg-[var(--color-ngo-surface-elevated)] rounded-[var(--radius-lg)] border border-dashed border-[var(--color-ngo-border)]'>
						<CheckCircle2 size={28} className='text-[var(--color-ngo-text-disabled)]' />
						<p className='text-sm text-[var(--color-ngo-text-muted)]'>No active pickups right now.</p>
						<Link to='/ngo/discover'>
							<Button variant='link' className='text-[var(--color-ngo-accent)] h-auto p-0 text-sm'>
								Discover available donations
							</Button>
						</Link>
					</div>
				) : (
					<div className='space-y-2.5'>
						{sorted.map((pickup) => {
							const isUrgent = pickup.donation.urgency === 'critical' || pickup.priority === 'urgent'
							
							return (
								<div
									key={pickup.id}
									className={cn(
										'flex flex-col gap-2 p-3 rounded-[var(--radius-lg)] border',
										isUrgent ? 'bg-[var(--color-error-light)] border-[var(--color-error)]/20' : 'bg-[var(--color-ngo-surface-elevated)] border-[var(--color-ngo-border-subtle)]'
									)}
								>
									<div className='flex items-start justify-between gap-2'>
										<div className='min-w-0'>
											<div className='flex items-center gap-2'>
												<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)] truncate'>
													{pickup.donation.donorName}
												</p>
												{isUrgent && (
													<span className='text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-error)] text-white'>
														URGENT
													</span>
												)}
											</div>
											<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5 truncate'>
												{pickup.donation.foodName} · {pickup.donation.quantityKg}kg
											</p>
										</div>
										<span className='text-xs font-semibold text-[var(--color-ngo-text-primary)]'>
											{new Date(pickup.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
										</span>
									</div>
									<div className='flex items-center gap-2 mt-1'>
										<MapPin size={12} className={isUrgent ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-text-muted)]'} />
										<span className={cn('text-xs truncate', isUrgent ? 'text-[var(--color-error)] font-medium' : 'text-[var(--color-ngo-text-muted)]')}>
											{pickup.donation.donorAddress}
										</span>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ── Recent Donations ──────────────────────────────────────────
function RecentDonations() {
	const { donations } = useNGOStore()
	const available = donations.filter(d => d.status === 'available').slice(0, 3)

	return (
		<Card className='border-[var(--color-ngo-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<Clock size={16} className='text-[var(--color-ngo-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
							Recently Listed Nearby
						</h3>
					</div>
					<Link
						to='/ngo/discover'
						className='text-xs text-[var(--color-ngo-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						View all <ArrowRight size={12} />
					</Link>
				</div>

				<div className='space-y-3'>
					{available.map((don) => (
						<div key={don.id} className='flex items-center gap-3 group cursor-pointer'>
							<img
								src={don.images[0]}
								alt={don.foodName}
								className='w-12 h-12 rounded-[var(--radius-md)] object-cover flex-shrink-0'
							/>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)] truncate group-hover:text-[var(--color-ngo-accent)] transition-colors'>
									{don.foodName}
								</p>
								<div className='flex items-center gap-2 mt-0.5'>
									<span className='text-[10px] text-[var(--color-ngo-text-muted)]'>
										{don.donorName}
									</span>
									<span className='text-[var(--color-ngo-border)]'>·</span>
									<span className='text-[10px] text-[var(--color-ngo-text-muted)]'>
										{formatRelativeTime(new Date(don.listedAt))}
									</span>
								</div>
							</div>
							<div className='flex flex-col items-end gap-1 flex-shrink-0'>
								<span className='text-xs font-bold text-[var(--color-ngo-text-primary)]'>
									{don.quantityKg} kg
								</span>
								<span className='text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--color-ngo-surface-elevated)] text-[var(--color-ngo-text-secondary)]'>
									{(don.distance! / 1000).toFixed(1)} km
								</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

// ── AI Suggestions Banner ─────────────────────────────────────
function AISuggestionsBanner() {
	// TODO: Connect to real AI suggestions API
	// For now, don't show anything if no suggestions
	return null
}

// ── Weather Card ──────────────────────────────────────────────
function WeatherCard() {
	// TODO: Connect to real weather API
	// For now, don't show weather card
	return null
}

// ── Main Dashboard Page ───────────────────────────────────────
export function NGODashboardPage() {
	const { profile, pickups, initialize, isLoaded } = useNGOStore()
	const activePickupsCount = pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length
	
	// Initialize data from API on mount
	React.useEffect(() => {
		initialize()
	}, [initialize])

	// Show loading state while data is being fetched
	if (!isLoaded) {
		return (
			<div className='flex items-center justify-center min-h-[50vh]'>
				<div className='text-center'>
					<p className='text-[var(--color-ngo-text-muted)]'>Loading dashboard...</p>
				</div>
			</div>
		)
	}

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 px-4 md:px-6 pt-6 pb-8 max-w-7xl mx-auto'
		>
			{/* ── Greeting Header ── */}
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-ngo-text-muted)]'>{getGreeting()}</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
					{profile.organizationName || 'Welcome'}
				</h1>
			</motion.div>

			{/* ── Stat Cards (2×2 grid) ── */}
			<motion.div
				variants={staggerContainer}
				className='grid grid-cols-2 lg:grid-cols-4 gap-3'
			>
				<StatCard
					icon={<Truck size={16} />}
					label='Active Pickups'
					value={String(activePickupsCount)}
					iconBg='bg-[var(--color-warning-light)]'
					iconColor='text-[var(--color-warning)]'
				/>
				<StatCard
					icon={<HeartHandshake size={16} />}
					label='Meals Served'
					value={formatCompact(profile.totalMealsServed)}
					change={12}
					changeLabel='vs last week'
					iconBg='bg-[var(--color-ngo-accent-light)]'
					iconColor='text-[var(--color-ngo-accent)]'
				/>
				<StatCard
					icon={<Leaf size={16} />}
					label='Food Rescued'
					value={`${formatCompact(profile.totalFoodRescuedKg)}kg`}
					iconBg='bg-[var(--color-success-light)]'
					iconColor='text-[var(--color-success)]'
				/>
				<StatCard
					icon={<Wind size={16} />}
					label='CO₂ Prevented'
					value={`${formatCompact(profile.totalCo2PreventedKg)}kg`}
					iconBg='bg-[var(--color-info-light)]'
					iconColor='text-[var(--color-info)]'
				/>
			</motion.div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
				{/* ── Active Pickups ── */}
				<motion.div variants={slideUp}>
					<ActivePickups />
				</motion.div>

				{/* ── Recent Donations ── */}
				<motion.div variants={slideUp}>
					<RecentDonations />
				</motion.div>
			</div>

			{/* ── Quick Actions Grid ── */}
			<motion.div variants={slideUp} className='grid grid-cols-2 md:grid-cols-4 gap-3'>
				<Link
					to='/ngo/discover'
					className='flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-xl)] bg-[var(--color-ngo-accent-light)] border border-[var(--color-ngo-border)] hover:shadow-md transition-all text-center group'
				>
					<div className='w-10 h-10 rounded-full bg-[var(--color-ngo-accent)] flex items-center justify-center text-white group-hover:scale-110 transition-transform'>
						<Search size={18} />
					</div>
					<span className='text-xs font-bold text-[var(--color-ngo-text-primary)]'>Find Food</span>
				</Link>

				<Link
					to='/ngo/pickups'
					className='flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-xl)] bg-[var(--color-ngo-surface-elevated)] border border-[var(--color-ngo-border)] hover:shadow-md transition-all text-center group'
				>
					<div className='w-10 h-10 rounded-full bg-[var(--color-ngo-secondary)] flex items-center justify-center text-[var(--color-ngo-accent)] group-hover:scale-110 transition-transform'>
						<Truck size={18} />
					</div>
					<span className='text-xs font-bold text-[var(--color-ngo-text-primary)]'>Pickups</span>
				</Link>

				<Link
					to='/ngo/impact'
					className='flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-xl)] bg-[var(--color-ngo-surface-elevated)] border border-[var(--color-ngo-border)] hover:shadow-md transition-all text-center group'
				>
					<div className='w-10 h-10 rounded-full bg-[var(--color-ngo-secondary)] flex items-center justify-center text-[var(--color-ngo-accent)] group-hover:scale-110 transition-transform'>
						<LineChart size={18} />
					</div>
					<span className='text-xs font-bold text-[var(--color-ngo-text-primary)]'>Impact</span>
				</Link>

				<Link
					to='/ngo/profile'
					className='flex flex-col items-center justify-center gap-2 p-4 rounded-[var(--radius-xl)] bg-[var(--color-ngo-surface-elevated)] border border-[var(--color-ngo-border)] hover:shadow-md transition-all text-center group'
				>
					<div className='w-10 h-10 rounded-full bg-[var(--color-ngo-secondary)] flex items-center justify-center text-[var(--color-ngo-accent)] group-hover:scale-110 transition-transform'>
						<Building2 size={18} />
					</div>
					<span className='text-xs font-bold text-[var(--color-ngo-text-primary)]'>Profile</span>
				</Link>
			</motion.div>
			
			<div className='h-4' />
		</motion.div>
	)
}