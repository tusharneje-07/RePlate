import { useState } from 'react'
import { motion } from 'motion/react'
import {
	TrendingUp,
	TrendingDown,
	IndianRupee,
	ShoppingBag,
	Users,
	Leaf,
	Wind,
	UtensilsCrossed,
	Star,
	BarChart3,
	ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'
import { mockSellerAnalytics, mockSellerProfile } from '@/data/seller-mock'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────
type Period = 'daily' | 'weekly'

// ── Helpers ─────────────────────────────────────────────────
function formatCompact(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
	return String(n)
}

// ── Overview Stat Card ───────────────────────────────────────
interface OverviewCardProps {
	icon: React.ReactNode
	label: string
	value: string
	change: number
	changeLabel: string
	iconBg: string
	iconColor: string
}

function OverviewCard({ icon, label, value, change, changeLabel, iconBg, iconColor }: OverviewCardProps) {
	const isPositive = change >= 0
	return (
		<motion.div variants={fadeIn}>
			<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none hover:shadow-md transition-shadow duration-200 overflow-hidden'>
				<CardContent className='p-4'>
					<div className='flex items-start justify-between gap-2 mb-3'>
						<div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0', iconBg)}>
							<span className={iconColor}>{icon}</span>
						</div>
						<div
							className={cn(
								'flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5',
								isPositive
									? 'bg-[var(--color-seller-eco-muted)] text-[#2d8a4e]'
									: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
							)}
						>
							{isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
							{Math.abs(change)}%
						</div>
					</div>
					<div className='text-[1.4rem] font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)] leading-tight'>
						{value}
					</div>
					<div className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{label}</div>
					<div className='text-[10px] text-[var(--color-seller-text-disabled)] mt-1'>{changeLabel}</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ── Revenue Bar Chart ────────────────────────────────────────
interface RevenueChartProps {
	data: { label: string; revenue: number; orders: number }[]
	maxRevenue: number
	isToday?: (label: string) => boolean
}

function RevenueChart({ data, maxRevenue, isToday }: RevenueChartProps) {
	const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

	return (
		<div className='w-full'>
			<div className='flex items-end gap-1.5 h-32'>
				{data.map((d, i) => {
					const height = maxRevenue > 0 ? Math.max(8, Math.round((d.revenue / maxRevenue) * 100)) : 8
					const today = isToday?.(d.label) ?? false
					const hovered = hoveredIdx === i
					return (
						<div
							key={d.label}
							className='flex-1 flex flex-col items-center gap-1 relative group'
							onMouseEnter={() => setHoveredIdx(i)}
							onMouseLeave={() => setHoveredIdx(null)}
						>
							{/* Tooltip */}
							{hovered && (
								<div className='absolute -top-16 left-1/2 -translate-x-1/2 z-10 bg-[var(--color-seller-text-primary)] text-white text-[10px] rounded-[var(--radius-md)] px-2 py-1.5 whitespace-nowrap shadow-lg pointer-events-none'>
									<div className='font-semibold'>{formatCurrency(d.revenue)}</div>
									<div className='opacity-75'>{d.orders} orders</div>
								</div>
							)}
							<div
								className={cn(
									'w-full rounded-t-[4px] transition-all duration-150',
									today
										? 'bg-[var(--color-seller-accent)]'
										: hovered
											? 'bg-[var(--color-seller-secondary)]'
											: 'bg-[var(--color-seller-accent-muted)]',
								)}
								style={{ height: `${height}%` }}
							/>
						</div>
					)
				})}
			</div>
			<div className='flex gap-1.5 mt-1.5'>
				{data.map((d) => (
					<div key={d.label} className='flex-1 text-center text-[10px] text-[var(--color-seller-text-muted)]'>
						{d.label}
					</div>
				))}
			</div>
		</div>
	)
}

// ── Category Split Row ───────────────────────────────────────
function CategoryRow({ category, percent, revenue }: { category: string; percent: number; revenue: number }) {
	const colors = ['bg-[var(--color-seller-accent)]', 'bg-[var(--color-seller-secondary)]', 'bg-amber-300', 'bg-amber-100']
	const idx = ['Pastries', 'Breads', 'Beverages', 'Specials'].indexOf(category)
	const barColor = colors[idx] ?? 'bg-[var(--color-seller-accent-muted)]'

	return (
		<div className='space-y-1'>
			<div className='flex items-center justify-between text-sm'>
				<span className='text-[var(--color-seller-text-secondary)] font-medium'>{category}</span>
				<div className='flex items-center gap-2'>
					<span className='text-[var(--color-seller-text-muted)] text-xs'>{formatCurrency(revenue)}</span>
					<span className='text-[var(--color-seller-text-primary)] font-semibold text-xs w-8 text-right'>{percent}%</span>
				</div>
			</div>
			<div className='h-2 w-full bg-[var(--color-seller-accent-muted)] rounded-full overflow-hidden'>
				<motion.div
					className={cn('h-full rounded-full', barColor)}
					initial={{ width: 0 }}
					animate={{ width: `${percent}%` }}
					transition={{ duration: 0.7, ease: 'easeOut' }}
				/>
			</div>
		</div>
	)
}

// ── Order Status Donut (CSS only) ────────────────────────────
function OrderStatusChart({ breakdown }: { breakdown: typeof mockSellerAnalytics.orderBreakdown }) {
	const total = Object.values(breakdown).reduce((s, v) => s + v, 0)
	const statuses = [
		{ label: 'Completed', count: breakdown.completed, color: '#2d8a4e' },
		{ label: 'Pending', count: breakdown.pending, color: '#d97706' },
		{ label: 'Confirmed', count: breakdown.confirmed, color: '#8a4a00' },
		{ label: 'Ready', count: breakdown.ready, color: '#2563eb' },
		{ label: 'Cancelled', count: breakdown.cancelled, color: '#dc2626' },
	]

	return (
		<div className='space-y-2.5'>
			{statuses
				.filter((s) => s.count > 0)
				.map((s) => (
					<div key={s.label} className='flex items-center gap-3'>
						<div className='w-2.5 h-2.5 rounded-full flex-shrink-0' style={{ backgroundColor: s.color }} />
						<span className='text-sm text-[var(--color-seller-text-secondary)] flex-1'>{s.label}</span>
						<span className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>{s.count}</span>
						<span className='text-xs text-[var(--color-seller-text-muted)] w-8 text-right'>
							{total > 0 ? Math.round((s.count / total) * 100) : 0}%
						</span>
					</div>
				))}
			{total === 0 && (
				<p className='text-sm text-[var(--color-seller-text-muted)] text-center py-2'>No orders data</p>
			)}
		</div>
	)
}

// ── Main Page ────────────────────────────────────────────────
export function SellerAnalyticsPage() {
	const analytics = mockSellerAnalytics
	const [period, setPeriod] = useState<Period>('daily')

	const chartData =
		period === 'daily'
			? analytics.dailyRevenue.map((d) => ({ label: d.day, revenue: d.revenue, orders: d.orders }))
			: analytics.weeklyRevenue.map((d) => ({ label: d.week, revenue: d.revenue, orders: d.orders }))

	const maxRevenue = Math.max(...chartData.map((d) => d.revenue), 1)
	const todayDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()]

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-24 md:pb-8'
		>
			{/* ── Header ── */}
			<motion.div variants={slideUp} className='flex items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						Analytics
					</h1>
					<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
						{mockSellerProfile.name} — all-time overview
					</p>
				</div>
				<div className='flex items-center gap-1.5 bg-[var(--color-seller-accent-muted)] rounded-full p-0.5'>
					{(['daily', 'weekly'] as const).map((p) => (
						<button
							key={p}
							onClick={() => setPeriod(p)}
							className={cn(
								'px-3 py-1 text-xs font-semibold rounded-full transition-colors capitalize',
								period === p
									? 'bg-[var(--color-seller-accent)] text-white shadow-sm'
									: 'text-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-light)]',
							)}
						>
							{p}
						</button>
					))}
				</div>
			</motion.div>

			{/* ── Overview Stats ── */}
			<motion.div variants={staggerContainer} className='grid grid-cols-2 gap-3'>
				<OverviewCard
					icon={<IndianRupee size={16} />}
					label='Total Revenue'
					value={formatCurrency(analytics.totalRevenue)}
					change={analytics.revenueChange}
					changeLabel='vs last month'
					iconBg='bg-[var(--color-seller-accent-muted)]'
					iconColor='text-[var(--color-seller-accent)]'
				/>
				<OverviewCard
					icon={<ShoppingBag size={16} />}
					label='Total Orders'
					value={String(analytics.totalOrders)}
					change={analytics.ordersChange}
					changeLabel='vs last month'
					iconBg='bg-[var(--color-seller-eco-muted)]'
					iconColor='text-[#2d8a4e]'
				/>
				<OverviewCard
					icon={<Users size={16} />}
					label='Customers'
					value={String(analytics.totalCustomers)}
					change={analytics.customersChange}
					changeLabel='vs last month'
					iconBg='bg-[var(--color-info-light)]'
					iconColor='text-[var(--color-info)]'
				/>
				<OverviewCard
					icon={<BarChart3 size={16} />}
					label='Avg Order Value'
					value={formatCurrency(analytics.avgOrderValue)}
					change={4.1}
					changeLabel='vs last month'
					iconBg='bg-amber-50'
					iconColor='text-amber-600'
				/>
			</motion.div>

			{/* ── Revenue Chart ── */}
			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
					<CardContent className='p-4'>
						<div className='flex items-center justify-between mb-4'>
							<div>
								<h2 className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>Revenue</h2>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5 capitalize'>{period} breakdown</p>
							</div>
							<div className='flex items-center gap-1 text-xs text-[var(--color-seller-text-muted)]'>
								<div className='w-2 h-2 rounded-full bg-[var(--color-seller-accent)]' />
								<span>Today</span>
								<div className='w-2 h-2 rounded-full bg-[var(--color-seller-accent-muted)] ml-2' />
								<span>Other</span>
							</div>
						</div>
						<RevenueChart
							data={chartData}
							maxRevenue={maxRevenue}
							isToday={period === 'daily' ? (label) => label === todayDay : undefined}
						/>
						{/* Total below chart */}
						<div className='flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-seller-border-subtle)]'>
							<span className='text-xs text-[var(--color-seller-text-muted)]'>
								{period === 'daily' ? 'This week' : 'This month'}
							</span>
							<span className='text-sm font-bold text-[var(--color-seller-text-primary)]'>
								{formatCurrency(chartData.reduce((s, d) => s + d.revenue, 0))}
							</span>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Orders Status + Category Split (2-col on md) ── */}
			<motion.div variants={staggerContainer} className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				{/* Order Status */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none h-full'>
						<CardContent className='p-4'>
							<div className='flex items-center justify-between mb-4'>
								<h2 className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>Order Status</h2>
								<span className='text-xs text-[var(--color-seller-text-muted)]'>
									{Object.values(analytics.orderBreakdown).reduce((s, v) => s + v, 0)} total
								</span>
							</div>
							<OrderStatusChart breakdown={analytics.orderBreakdown} />
						</CardContent>
					</Card>
				</motion.div>

				{/* Category Split */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none h-full'>
						<CardContent className='p-4'>
							<h2 className='text-sm font-semibold text-[var(--color-seller-text-primary)] mb-4'>Revenue by Category</h2>
							<div className='space-y-3'>
								{analytics.categorySplit.map((c) => (
									<CategoryRow key={c.category} category={c.category} percent={c.percent} revenue={c.revenue} />
								))}
							</div>
						</CardContent>
					</Card>
				</motion.div>
			</motion.div>

			{/* ── Top Listings ── */}
			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
					<CardContent className='p-4'>
						<div className='flex items-center justify-between mb-4'>
							<h2 className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>Top Listings</h2>
							<Badge className='text-[10px] bg-[var(--color-seller-accent-muted)] text-[var(--color-seller-accent)] border-0'>
								All time
							</Badge>
						</div>
						<div className='space-y-3'>
							{analytics.topListings.map((listing, i) => (
								<div key={listing.listingId} className='flex items-center gap-3'>
									{/* Rank */}
									<span
										className={cn(
											'w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full flex-shrink-0',
											i === 0
												? 'bg-amber-400 text-white'
												: i === 1
													? 'bg-slate-300 text-slate-700'
													: i === 2
														? 'bg-orange-200 text-orange-700'
														: 'bg-[var(--color-seller-border-subtle)] text-[var(--color-seller-text-muted)]',
										)}
									>
										{i + 1}
									</span>
									{/* Image */}
									<div className='w-9 h-9 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 bg-[var(--color-seller-accent-muted)]'>
										{listing.image && (
											<img src={listing.image} alt={listing.name} className='w-full h-full object-cover' />
										)}
									</div>
									{/* Info */}
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-medium text-[var(--color-seller-text-primary)] truncate'>{listing.name}</p>
										<div className='flex items-center gap-2 mt-0.5'>
											<span className='text-xs text-[var(--color-seller-text-muted)]'>{listing.unitsSold} sold</span>
											<span className='text-[var(--color-seller-border)] text-xs'>·</span>
											<div className='flex items-center gap-0.5'>
												<Star size={10} className='text-amber-400 fill-amber-400' />
												<span className='text-xs text-[var(--color-seller-text-muted)]'>{listing.rating}</span>
											</div>
										</div>
									</div>
									{/* Revenue */}
									<div className='text-right flex-shrink-0'>
										<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
											{formatCurrency(listing.revenue)}
										</p>
										<div className='flex items-center justify-end gap-0.5 mt-0.5'>
											<ArrowUpRight size={10} className='text-[#2d8a4e]' />
											<span className='text-[10px] text-[#2d8a4e] font-medium'>
												{Math.round((listing.revenue / analytics.totalRevenue) * 100)}%
											</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Sustainability Metrics ── */}
			<motion.div variants={slideUp}>
				<Card className='border-0 shadow-none overflow-hidden bg-gradient-to-br from-[#1a3a28] to-[#2d5a3e]'>
					<CardContent className='p-4'>
						<div className='flex items-center gap-2 mb-4'>
							<Leaf size={16} className='text-[#7ecfa0]' />
							<h2 className='text-sm font-semibold text-white'>Sustainability Impact</h2>
							<Badge className='text-[10px] border-0 bg-white/10 text-white ml-auto'>All time</Badge>
						</div>
						<div className='grid grid-cols-3 gap-3'>
							<div className='bg-white/8 rounded-[var(--radius-lg)] p-3 text-center'>
								<Leaf size={18} className='mx-auto mb-1.5 text-[#7ecfa0]' />
								<p className='text-[1.1rem] font-bold font-[var(--font-display)] text-white leading-tight'>
									{formatCompact(analytics.totalFoodSavedKg)}
									<span className='text-xs font-normal ml-0.5'>kg</span>
								</p>
								<p className='text-[10px] text-white/60 mt-0.5 leading-tight'>Food Saved</p>
							</div>
							<div className='bg-white/8 rounded-[var(--radius-lg)] p-3 text-center'>
								<Wind size={18} className='mx-auto mb-1.5 text-sky-300' />
								<p className='text-[1.1rem] font-bold font-[var(--font-display)] text-white leading-tight'>
									{formatCompact(analytics.totalCo2PreventedKg)}
									<span className='text-xs font-normal ml-0.5'>kg</span>
								</p>
								<p className='text-[10px] text-white/60 mt-0.5 leading-tight'>CO₂ Prevented</p>
							</div>
							<div className='bg-white/8 rounded-[var(--radius-lg)] p-3 text-center'>
								<UtensilsCrossed size={18} className='mx-auto mb-1.5 text-amber-300' />
								<p className='text-[1.1rem] font-bold font-[var(--font-display)] text-white leading-tight'>
									{formatCompact(analytics.totalMealsServed)}
								</p>
								<p className='text-[10px] text-white/60 mt-0.5 leading-tight'>Meals Served</p>
							</div>
						</div>
						{/* Equivalent context */}
						<p className='text-[11px] text-white/50 mt-3 text-center leading-relaxed'>
							Equivalent to taking {Math.round(analytics.totalCo2PreventedKg / 120)} cars off the road for a day
						</p>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}
