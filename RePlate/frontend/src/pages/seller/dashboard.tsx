import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	TrendingUp,
	TrendingDown,
	ArrowRight,
	ShoppingBag,
	IndianRupee,
	Leaf,
	Wind,
	Clock,
	CheckCircle2,
	AlertCircle,
	Sparkles,
	Sun,
	Plus,
	PackageOpen,
	Star,
	ChevronRight,
	Zap,
	BarChart3,
} from 'lucide-react'
import { motion as m } from 'motion/react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { useSellerStore } from '@/stores/seller-store'
import { useSellerUIStore } from '@/stores/seller-ui-store'
import {
	mockSellerProfile,
	mockSellerAnalytics,
	mockAIPricingSuggestions,
	mockWeatherSuggestion,
} from '@/data/seller-mock'
import { cn } from '@/lib/utils'

// ── Helper: greeting ────────────────────────────────────────
function getGreeting(): string {
	const h = new Date().getHours()
	if (h < 12) return 'Good morning'
	if (h < 17) return 'Good afternoon'
	return 'Good evening'
}

// ── Helper: format large numbers ────────────────────────────
function formatCompact(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
	return String(n)
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
		<motion.div variants={fadeIn}>
			<Card className='overflow-hidden border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none hover:shadow-md transition-shadow duration-200'>
				<CardContent className='p-4'>
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
					<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)] leading-tight'>
						{value}
					</p>
					<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{label}</p>
					{changeLabel && (
						<p className='text-[10px] text-[var(--color-seller-text-disabled)] mt-1'>{changeLabel}</p>
					)}
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ── Revenue Bar Chart (pure SVG / CSS) ───────────────────────
function RevenueChart() {
	const data = mockSellerAnalytics.dailyRevenue
	const maxRevenue = Math.max(...data.map((d) => d.revenue))
	const today = new Date().getDay() // 0=Sun, 1=Mon...
	const dayIndex = today === 0 ? 6 : today - 1 // convert to Mon=0 index

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<BarChart3 size={16} className='text-[var(--color-seller-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							This Week's Revenue
						</h3>
					</div>
					<Link
						to='/seller/analytics'
						className='text-xs text-[var(--color-seller-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						Full analytics <ArrowRight size={12} />
					</Link>
				</div>

				{/* Bars */}
				<div className='flex items-end gap-1.5 h-28'>
					{data.map((d, i) => {
						const heightPct = maxRevenue > 0 ? (d.revenue / maxRevenue) * 100 : 0
						const isToday = i === dayIndex

						return (
							<div key={d.day} className='flex-1 flex flex-col items-center gap-1.5 group'>
								{/* Tooltip on hover */}
								<div className='relative flex-1 flex items-end w-full'>
									<div className='absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none'>
										<div className='bg-[var(--color-seller-text-primary)] text-white text-[9px] font-semibold px-2 py-0.5 rounded whitespace-nowrap'>
											{formatCurrency(d.revenue)}
										</div>
										<div className='w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[var(--color-seller-text-primary)]' />
									</div>
									<div
										className={cn(
											'w-full rounded-t-[4px] transition-all duration-500',
											isToday
												? 'bg-[var(--color-seller-accent)]'
												: 'bg-[var(--color-seller-secondary)] group-hover:bg-[var(--color-seller-accent)]/60',
										)}
										style={{ height: `${Math.max(heightPct, 4)}%` }}
									/>
								</div>
								<span
									className={cn(
										'text-[9px] font-medium',
										isToday ? 'text-[var(--color-seller-accent)] font-bold' : 'text-[var(--color-seller-text-muted)]',
									)}
								>
									{d.day}
								</span>
							</div>
						)
					})}
				</div>

				{/* Summary row */}
				<div className='mt-4 pt-3 border-t border-[var(--color-seller-border-subtle)] flex items-center justify-between text-xs text-[var(--color-seller-text-muted)]'>
					<span>
						Week total:{' '}
						<span className='font-bold text-[var(--color-seller-text-primary)]'>
							{formatCurrency(data.reduce((s, d) => s + d.revenue, 0))}
						</span>
					</span>
					<span>
						{data.reduce((s, d) => s + d.orders, 0)} orders
					</span>
				</div>
			</CardContent>
		</Card>
	)
}

// ── Order Status Breakdown ────────────────────────────────────
function OrderBreakdown() {
	const { orders, updateOrderStatus } = useSellerStore()

	const pending = orders.filter((o) => o.status === 'pending')
	const confirmed = orders.filter((o) => o.status === 'confirmed')
	const ready = orders.filter((o) => o.status === 'ready_for_pickup')

	const actionItems = [
		{
			orders: pending,
			label: 'Need Confirmation',
			color: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
			dot: 'bg-[var(--color-warning)]',
			action: 'Confirm',
			nextStatus: 'confirmed' as const,
		},
		{
			orders: confirmed,
			label: 'Being Prepared',
			color: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
			dot: 'bg-[var(--color-info)]',
			action: 'Mark Ready',
			nextStatus: 'ready_for_pickup' as const,
		},
		{
			orders: ready,
			label: 'Ready for Pickup',
			color: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
			dot: 'bg-[var(--color-success)]',
			action: 'Complete',
			nextStatus: 'completed' as const,
		},
	]

	const totalActive = pending.length + confirmed.length + ready.length

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<ShoppingBag size={16} className='text-[var(--color-seller-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Active Orders
						</h3>
						{totalActive > 0 && (
							<span className='w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold'>
								{totalActive}
							</span>
						)}
					</div>
					<Link
						to='/seller/orders'
						className='text-xs text-[var(--color-seller-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						All orders <ArrowRight size={12} />
					</Link>
				</div>

				{totalActive === 0 ? (
					<div className='flex flex-col items-center gap-2 py-4 text-center'>
						<CheckCircle2 size={28} className='text-[var(--color-success)] opacity-60' />
						<p className='text-sm text-[var(--color-seller-text-muted)]'>All caught up! No active orders.</p>
					</div>
				) : (
					<div className='space-y-2.5'>
						{actionItems.map((group) =>
							group.orders.map((order) => (
								<div
									key={order.id}
									className='flex items-center gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-seller-surface-elevated)] border border-[var(--color-seller-border-subtle)]'
								>
									{/* Status dot */}
									<div className={cn('w-2 h-2 rounded-full flex-shrink-0', group.dot)} />

									{/* Info */}
									<div className='flex-1 min-w-0'>
										<div className='flex items-center gap-2'>
											<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] truncate'>
												{order.customer.name}
											</p>
											<span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', group.color)}>
												{group.label}
											</span>
										</div>
										<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
											{order.orderNumber} · {formatCurrency(order.totalAmount)} ·{' '}
											<Clock size={10} className='inline mb-0.5' />{' '}
											{formatRelativeTime(new Date(order.placedAt))}
										</p>
									</div>

									{/* Action */}
									<button
										type='button'
										onClick={() => updateOrderStatus(order.id, group.nextStatus)}
										className='flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-seller-accent)] text-white hover:bg-[var(--color-seller-accent-hover)] transition-colors'
									>
										{group.action}
									</button>
								</div>
							)),
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

// ── Top Listings ─────────────────────────────────────────────
function TopListings() {
	const topListings = mockSellerAnalytics.topListings.slice(0, 4)

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<TrendingUp size={16} className='text-[var(--color-seller-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Top Listings This Week
						</h3>
					</div>
					<Link
						to='/seller/listings'
						className='text-xs text-[var(--color-seller-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						All listings <ArrowRight size={12} />
					</Link>
				</div>

				<div className='space-y-3'>
					{topListings.map((item, i) => (
						<div key={item.listingId} className='flex items-center gap-3'>
							{/* Rank */}
							<span
								className={cn(
									'w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0',
									i === 0
										? 'bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)]'
										: 'bg-[var(--color-seller-surface-elevated)] text-[var(--color-seller-text-muted)]',
								)}
							>
								{i + 1}
							</span>

							{/* Image */}
							<img
								src={item.image}
								alt={item.name}
								className='w-10 h-10 rounded-[var(--radius-md)] object-cover flex-shrink-0'
							/>

							{/* Info */}
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] truncate'>
									{item.name}
								</p>
								<div className='flex items-center gap-2 mt-0.5'>
									<span className='text-[10px] text-[var(--color-seller-text-muted)]'>
										{item.unitsSold} sold
									</span>
									<span className='text-[var(--color-seller-border)]'>·</span>
									<Star size={9} className='text-[var(--color-warning)] fill-[var(--color-warning)]' />
									<span className='text-[10px] text-[var(--color-seller-text-muted)]'>{item.rating}</span>
								</div>
							</div>

							{/* Revenue */}
							<span className='text-sm font-bold text-[var(--color-seller-text-primary)] flex-shrink-0'>
								{formatCurrency(item.revenue)}
							</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

// ── AI Pricing Suggestion Banner ─────────────────────────────
function AIPricingBanner() {
	const { setAiPricingOpen, setAiPricingListingId } = useSellerUIStore()
	const { listings } = useSellerStore()
	const suggestions = mockAIPricingSuggestions

	if (suggestions.length === 0) return null

	const firstSuggestion = suggestions[0]
	const listing = listings.find((l) => l.id === firstSuggestion.listingId)

	const handleOpen = () => {
		setAiPricingListingId(firstSuggestion.listingId)
		setAiPricingOpen(true)
	}

	return (
		<motion.div
			variants={slideUp}
			className='relative overflow-hidden rounded-[var(--radius-xl)] p-4'
			style={{
				background: 'linear-gradient(135deg, #8a4a00 0%, #b35c00 60%, #d97706 100%)',
			}}
		>
			{/* Decorative circles */}
			<div className='absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none' />
			<div className='absolute right-4 -bottom-4 w-20 h-20 rounded-full bg-white/5 pointer-events-none' />

			<div className='relative flex items-start gap-3'>
				<div className='w-9 h-9 rounded-[var(--radius-md)] bg-white/20 flex items-center justify-center flex-shrink-0'>
					<Sparkles size={18} className='text-white' />
				</div>
				<div className='flex-1 min-w-0'>
					<div className='flex items-center gap-2 mb-1'>
						<p className='text-[10px] font-medium text-white/70'>AI Pricing Suggestion</p>
						<span className='text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full'>
							{suggestions.length} active
						</span>
					</div>
					<h3 className='font-semibold text-sm text-white leading-snug'>
						{listing?.name ?? firstSuggestion.listingId}: Drop price from{' '}
						{formatCurrency(firstSuggestion.currentPrice)} → {formatCurrency(firstSuggestion.suggestedPrice)}{' '}
						to sell out
					</h3>
					<p className='text-[11px] text-white/70 mt-1 line-clamp-2'>{firstSuggestion.reasoning}</p>
					<button
						type='button'
						onClick={handleOpen}
						className='inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-full text-white'
					>
						Review suggestions <ChevronRight size={12} />
					</button>
				</div>
			</div>
		</motion.div>
	)
}

// ── Weather Card ──────────────────────────────────────────────
function WeatherCard() {
	const weather = mockWeatherSuggestion

	return (
		<div className='flex items-start gap-3 px-4 py-3 bg-[var(--color-seller-accent-light)] rounded-[var(--radius-xl)] border border-[var(--color-seller-accent-muted)]'>
			<span className='text-2xl flex-shrink-0 mt-0.5'>{weather.icon}</span>
			<div className='min-w-0'>
				<div className='flex items-center gap-2 mb-0.5'>
					<p className='text-sm font-semibold text-[var(--color-seller-accent)]'>{weather.condition}</p>
					<span className='text-xs text-[var(--color-seller-text-muted)]'>{weather.temperature}°C</span>
				</div>
				<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>
					{weather.recommendation}
				</p>
			</div>
		</div>
	)
}

// ── Eco Impact Strip ──────────────────────────────────────────
function EcoImpactStrip() {
	const stats = [
		{
			icon: <Leaf size={14} />,
			value: `${formatCompact(mockSellerProfile.totalFoodSavedKg)}kg`,
			label: 'Food Saved',
			color: 'text-[var(--color-success)]',
			bg: 'bg-[var(--color-success-light)]',
		},
		{
			icon: <Wind size={14} />,
			value: `${formatCompact(mockSellerProfile.totalCo2PreventedKg)}kg`,
			label: 'CO₂ Prevented',
			color: 'text-[var(--color-info)]',
			bg: 'bg-[var(--color-info-light)]',
		},
		{
			icon: <ShoppingBag size={14} />,
			value: formatCompact(mockSellerProfile.totalMealsServed),
			label: 'Meals Served',
			color: 'text-[var(--color-seller-accent)]',
			bg: 'bg-[var(--color-seller-accent-light)]',
		},
	]

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none bg-[var(--color-seller-eco-muted)]'>
			<CardContent className='p-4'>
				<div className='flex items-center gap-2 mb-3'>
					<Leaf size={15} className='text-[var(--color-success)]' />
					<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						Your Sustainability Impact
					</h3>
				</div>
				<div className='grid grid-cols-3 gap-3'>
					{stats.map((s) => (
						<div key={s.label} className='text-center'>
							<div
								className={cn(
									'w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-1.5',
									s.bg,
								)}
							>
								<span className={s.color}>{s.icon}</span>
							</div>
							<p className={cn('text-base font-bold font-[var(--font-display)]', s.color)}>{s.value}</p>
							<p className='text-[10px] text-[var(--color-seller-text-muted)] mt-0.5'>{s.label}</p>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}

// ── Recent Activity Row ───────────────────────────────────────
function RecentActivity() {
	const { orders } = useSellerStore()
	const recent = [...orders]
		.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
		.slice(0, 4)

	const statusConfig: Record<
		string,
		{ label: string; color: string; bg: string }
	> = {
		pending: { label: 'Pending', color: 'text-[var(--color-warning)]', bg: 'bg-[var(--color-warning-light)]' },
		confirmed: { label: 'Confirmed', color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-light)]' },
		ready_for_pickup: { label: 'Ready', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-light)]' },
		completed: { label: 'Completed', color: 'text-[var(--color-success)]', bg: 'bg-[var(--color-success-light)]' },
		cancelled: { label: 'Cancelled', color: 'text-[var(--color-error)]', bg: 'bg-[var(--color-error-light)]' },
		preparing: { label: 'Preparing', color: 'text-[var(--color-info)]', bg: 'bg-[var(--color-info-light)]' },
	}

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none'>
			<CardContent className='p-4'>
				<div className='flex items-center justify-between mb-4'>
					<div className='flex items-center gap-2'>
						<Clock size={16} className='text-[var(--color-seller-accent)]' />
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Recent Activity
						</h3>
					</div>
					<Link
						to='/seller/orders'
						className='text-xs text-[var(--color-seller-accent)] font-medium flex items-center gap-1 hover:underline'
					>
						All orders <ArrowRight size={12} />
					</Link>
				</div>

				<div className='space-y-3'>
					{recent.map((order) => {
						const cfg = statusConfig[order.status] ?? {
							label: order.status,
							color: 'text-[var(--color-seller-text-muted)]',
							bg: 'bg-[var(--color-seller-surface-elevated)]',
						}
						return (
							<div key={order.id} className='flex items-center gap-3'>
								<Avatar className='w-8 h-8 flex-shrink-0'>
									<AvatarImage src={order.customer.avatar} alt={order.customer.name} />
									<AvatarFallback className='bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] text-xs font-bold'>
										{order.customer.name
											.split(' ')
											.map((n) => n[0])
											.join('')
											.slice(0, 2)}
									</AvatarFallback>
								</Avatar>
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] truncate'>
										{order.customer.name}
									</p>
									<p className='text-[11px] text-[var(--color-seller-text-muted)] truncate'>
										{order.items.map((i) => i.listingName).join(', ')}
									</p>
								</div>
								<div className='flex flex-col items-end gap-1 flex-shrink-0'>
									<span className='text-sm font-bold text-[var(--color-seller-text-primary)]'>
										{formatCurrency(order.totalAmount)}
									</span>
									<span
										className={cn(
											'text-[9px] font-semibold px-1.5 py-0.5 rounded-full',
											cfg.bg,
											cfg.color,
										)}
									>
										{cfg.label}
									</span>
								</div>
							</div>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}

// ── Main Dashboard Page ───────────────────────────────────────
export function SellerDashboardPage() {
	const analytics = mockSellerAnalytics
	const profile = mockSellerProfile

	const todayRevenue = analytics.dailyRevenue[analytics.dailyRevenue.length - 1]?.revenue ?? 0
	const todayOrders = analytics.dailyRevenue[analytics.dailyRevenue.length - 1]?.orders ?? 0

	// today's vs yesterday's
	const yesterdayRevenue = analytics.dailyRevenue[analytics.dailyRevenue.length - 2]?.revenue ?? 0
	const revenueChange =
		yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-8'
		>
			{/* ── Greeting Header ── */}
			<motion.div variants={slideUp} className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-sm text-[var(--color-seller-text-muted)] mb-0.5'>{getGreeting()}</p>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						{profile.ownerName.split(' ')[0]}
					</h1>
					<div className='flex items-center gap-1.5 mt-1'>
						<span
							className={cn(
								'w-2 h-2 rounded-full',
								profile.isOpen ? 'bg-[var(--color-success)] animate-pulse' : 'bg-[var(--color-seller-text-muted)]',
							)}
						/>
						<p className='text-xs text-[var(--color-seller-text-muted)]'>
							{profile.isOpen ? 'Store is open' : 'Store is closed'} · {profile.name}
						</p>
					</div>
				</div>

				{/* Quick action: create listing */}
				<Link to='/seller/listings'>
					<Button
						size='sm'
						className='gap-1.5 bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white rounded-[var(--radius-lg)] flex-shrink-0'
					>
						<Plus size={14} />
						<span className='hidden sm:inline'>New Listing</span>
					</Button>
				</Link>
			</motion.div>

			{/* ── Weather Card ── */}
			<motion.div variants={slideUp}>
				<WeatherCard />
			</motion.div>

			{/* ── Stat Cards (2×2 grid) ── */}
			<motion.div
				variants={staggerContainer}
				className='grid grid-cols-2 gap-3'
			>
				<StatCard
					icon={<IndianRupee size={16} />}
					label="Today's Revenue"
					value={formatCurrency(todayRevenue)}
					change={revenueChange}
					changeLabel='vs yesterday'
					iconBg='bg-[var(--color-seller-accent-light)]'
					iconColor='text-[var(--color-seller-accent)]'
				/>
				<StatCard
					icon={<ShoppingBag size={16} />}
					label="Today's Orders"
					value={String(todayOrders)}
					change={analytics.ordersChange}
					changeLabel='vs last week'
					iconBg='bg-[var(--color-info-light)]'
					iconColor='text-[var(--color-info)]'
				/>
				<StatCard
					icon={<Leaf size={16} />}
					label='Food Saved Today'
					value={`${(todayOrders * 0.6).toFixed(1)}kg`}
					iconBg='bg-[var(--color-success-light)]'
					iconColor='text-[var(--color-success)]'
				/>
				<StatCard
					icon={<Wind size={16} />}
					label='CO₂ Prevented'
					value={`${(todayOrders * 1.5).toFixed(1)}kg`}
					iconBg='bg-[var(--color-info-light)]'
					iconColor='text-[var(--color-info)]'
				/>
			</motion.div>

			{/* ── AI Pricing Banner ── */}
			<AIPricingBanner />

			{/* ── Active Orders ── */}
			<motion.div variants={slideUp}>
				<OrderBreakdown />
			</motion.div>

			{/* ── Revenue Chart ── */}
			<motion.div variants={slideUp}>
				<RevenueChart />
			</motion.div>

			{/* ── Top Listings ── */}
			<motion.div variants={slideUp}>
				<TopListings />
			</motion.div>

			{/* ── Recent Activity ── */}
			<motion.div variants={slideUp}>
				<RecentActivity />
			</motion.div>

			{/* ── Eco Impact ── */}
			<motion.div variants={slideUp}>
				<EcoImpactStrip />
			</motion.div>

			{/* ── Quick Actions ── */}
			<motion.div variants={slideUp} className='grid grid-cols-2 gap-3'>
				<Link
					to='/seller/listings'
					className='flex items-center gap-3 p-3.5 rounded-[var(--radius-xl)] bg-[var(--color-seller-accent-light)] border border-[var(--color-seller-accent-muted)] hover:shadow-md transition-shadow group'
				>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-accent)] flex items-center justify-center flex-shrink-0'>
						<PackageOpen size={16} className='text-white' />
					</div>
					<div className='min-w-0'>
						<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>Manage Listings</p>
						<p className='text-[10px] text-[var(--color-seller-text-muted)]'>Add or edit items</p>
					</div>
					<ChevronRight size={14} className='text-[var(--color-seller-accent)] ml-auto group-hover:translate-x-0.5 transition-transform' />
				</Link>

				<Link
					to='/seller/orders'
					className='flex items-center gap-3 p-3.5 rounded-[var(--radius-xl)] bg-[var(--color-seller-surface-elevated)] border border-[var(--color-seller-border)] hover:shadow-md transition-shadow group'
				>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-secondary)] flex items-center justify-center flex-shrink-0'>
						<Zap size={16} className='text-[var(--color-seller-accent)]' />
					</div>
					<div className='min-w-0'>
						<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>View Orders</p>
						<p className='text-[10px] text-[var(--color-seller-text-muted)]'>Track & manage</p>
					</div>
					<ChevronRight size={14} className='text-[var(--color-seller-text-muted)] ml-auto group-hover:translate-x-0.5 transition-transform' />
				</Link>

				<Link
					to='/seller/analytics'
					className='flex items-center gap-3 p-3.5 rounded-[var(--radius-xl)] bg-[var(--color-seller-surface-elevated)] border border-[var(--color-seller-border)] hover:shadow-md transition-shadow group'
				>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-secondary)] flex items-center justify-center flex-shrink-0'>
						<BarChart3 size={16} className='text-[var(--color-seller-accent)]' />
					</div>
					<div className='min-w-0'>
						<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>Analytics</p>
						<p className='text-[10px] text-[var(--color-seller-text-muted)]'>Insights & trends</p>
					</div>
					<ChevronRight size={14} className='text-[var(--color-seller-text-muted)] ml-auto group-hover:translate-x-0.5 transition-transform' />
				</Link>

				<Link
					to='/seller/reviews'
					className='flex items-center gap-3 p-3.5 rounded-[var(--radius-xl)] bg-[var(--color-seller-surface-elevated)] border border-[var(--color-seller-border)] hover:shadow-md transition-shadow group'
				>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-secondary)] flex items-center justify-center flex-shrink-0'>
						<Star size={16} className='text-[var(--color-seller-accent)]' />
					</div>
					<div className='min-w-0'>
						<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>Reviews</p>
						<p className='text-[10px] text-[var(--color-seller-text-muted)]'>Customer feedback</p>
					</div>
					<ChevronRight size={14} className='text-[var(--color-seller-text-muted)] ml-auto group-hover:translate-x-0.5 transition-transform' />
				</Link>
			</motion.div>

			{/* Bottom padding for mobile nav */}
			<div className='h-4' />
		</motion.div>
	)
}
