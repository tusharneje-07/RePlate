import { useState } from 'react'
import type React from 'react'
import { motion } from 'motion/react'
import { Leaf, Users, Zap, Package, TrendingUp, Award, BarChart2, Calendar, TreePine, Car, Plane, Flame } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { useNGOStore } from '@/stores/ngo-store'
import { mockNGOImpact } from '@/data/ngo-mock'
import { CO2_PER_TREE_YEAR, CO2_PER_CAR_KM, CO2_PER_FLIGHT_MUM_DEL } from '@/lib/utils'

// ── Mini bar chart ─────────────────────────────────────────────
function BarChart({
	data,
	valueKey,
	labelKey,
	color,
}: {
	data: Record<string, number | string>[]
	valueKey: string
	labelKey: string
	color: string
}) {
	const max = Math.max(...data.map((d) => Number(d[valueKey])))
	return (
		<div className='flex items-end gap-1 h-24 w-full'>
			{data.map((d, i) => {
				const pct = max > 0 ? (Number(d[valueKey]) / max) * 100 : 0
				return (
					<div key={i} className='flex-1 flex flex-col items-center gap-1'>
						<div className='w-full flex flex-col justify-end' style={{ height: '80px' }}>
							<motion.div
								initial={{ height: 0 }}
								animate={{ height: `${pct}%` }}
								transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 22 }}
								className='w-full rounded-t-sm'
								style={{ backgroundColor: color, minHeight: pct > 0 ? 2 : 0 }}
							/>
						</div>
						<span className='text-[9px] font-medium text-[var(--color-ngo-text-muted)]'>{String(d[labelKey])}</span>
					</div>
				)
			})}
		</div>
	)
}

// ── Stat pill ──────────────────────────────────────────────────
function StatCard({
	icon,
	label,
	value,
	sub,
	accent,
}: {
	icon: React.ReactNode
	label: string
	value: string
	sub?: string
	accent: string
}) {
	return (
		<div
			className='rounded-[var(--radius-xl)] p-4 border flex flex-col gap-2'
			style={{ background: accent + '18', borderColor: accent + '30' }}
		>
			<div className='flex items-center gap-2'>
				<div
					className='w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0'
					style={{ background: accent + '25' }}
				>
					{icon}
				</div>
				<p className='text-xs font-semibold text-[var(--color-ngo-text-muted)] uppercase tracking-wide'>{label}</p>
			</div>
			<p className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>{value}</p>
			{sub && <p className='text-xs text-[var(--color-ngo-text-muted)]'>{sub}</p>}
		</div>
	)
}

// ── CO₂ equivalents ────────────────────────────────────────────
const CO2_EQUIVALENTS: { label: string; divisor: number; icon: React.ReactNode }[] = [
	{ label: 'Trees planted for a year', divisor: CO2_PER_TREE_YEAR, icon: <TreePine size={20} /> },
	{ label: 'Car km not driven', divisor: CO2_PER_CAR_KM, icon: <Car size={20} /> },
	{ label: 'Flights Mumbai→Delhi avoided', divisor: CO2_PER_FLIGHT_MUM_DEL, icon: <Plane size={20} /> },
]

// ── Main Page ──────────────────────────────────────────────────
export function NGOImpactPage() {
	const { history } = useNGOStore()
	const impact = mockNGOImpact
	const [chartView, setChartView] = useState<'weekly' | 'monthly'>('weekly')
	const [chartMetric, setChartMetric] = useState<'foodKg' | 'meals' | 'pickups'>('meals')

	const chartData = chartView === 'weekly' ? impact.weeklyData : impact.monthlyData
	const labelKey = chartView === 'weekly' ? 'day' : 'month'

	const metricConfig: Record<string, { label: string; color: string; suffix: string }> = {
		foodKg: { label: 'Food Rescued (kg)', color: 'var(--color-ngo-accent)', suffix: 'kg' },
		meals: { label: 'Meals Served', color: '#3b82f6', suffix: '' },
		pickups: { label: 'Pickups', color: '#f59e0b', suffix: '' },
	}

	const totalThisWeek = impact.weeklyData.reduce((acc, d) => acc + d.foodKg, 0)

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Header ── */}
			<div className='sticky top-0 z-20 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] px-4 py-3'>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
					Impact Dashboard
				</h1>
				<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>
					Your environmental and social footprint
				</p>
			</div>

			<div className='flex-1 overflow-y-auto p-4 md:px-6'>
				<motion.div
					variants={staggerContainer}
					initial='hidden'
					animate='visible'
					className='max-w-3xl mx-auto space-y-6 pb-24'
				>
					{/* ── Streak Banner ── */}
					<motion.div variants={fadeIn}>
						<div className='rounded-[var(--radius-xl)] bg-gradient-to-r from-[var(--color-ngo-accent)] to-emerald-500 p-5 text-white flex items-center gap-4 shadow-lg'>
						<div className='w-14 h-14 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm'>
							<Flame size={28} className='text-white' />
						</div>
							<div>
								<p className='text-sm font-semibold text-white/80'>Active Streak</p>
								<p className='text-3xl font-bold font-[var(--font-display)]'>{impact.streak} days</p>
								<p className='text-xs text-white/70 mt-0.5'>
									{totalThisWeek} kg rescued this week · Keep it up!
								</p>
							</div>
							<div className='ml-auto'>
								<Award size={36} className='text-white/30' />
							</div>
						</div>
					</motion.div>

					{/* ── Lifetime Stats Grid ── */}
					<motion.div variants={slideUp}>
						<h2 className='text-sm font-bold text-[var(--color-ngo-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2'>
							<TrendingUp size={14} className='text-[var(--color-ngo-accent)]' /> Lifetime Impact
						</h2>
						<div className='grid grid-cols-2 gap-3'>
							<StatCard
								icon={<Package size={16} style={{ color: 'var(--color-ngo-accent)' }} />}
								label='Food Rescued'
								value={`${(impact.totalFoodRescuedKg / 1000).toFixed(1)}t`}
								sub={`${impact.totalFoodRescuedKg.toLocaleString()} kg total`}
								accent='#009022'
							/>
							<StatCard
								icon={<Users size={16} style={{ color: '#3b82f6' }} />}
								label='Meals Served'
								value={impact.totalMealsServed.toLocaleString()}
								sub={`~${impact.communityReach.toLocaleString()} people reached`}
								accent='#3b82f6'
							/>
							<StatCard
								icon={<Leaf size={16} style={{ color: '#10b981' }} />}
								label='CO₂ Prevented'
								value={`${(impact.totalCo2PreventedKg / 1000).toFixed(1)}t`}
								sub={`${impact.totalCo2PreventedKg.toLocaleString()} kg CO₂`}
								accent='#10b981'
							/>
							<StatCard
								icon={<Zap size={16} style={{ color: '#f59e0b' }} />}
								label='Total Pickups'
								value={impact.totalPickups.toLocaleString()}
								sub={`${impact.activePickups} active now`}
								accent='#f59e0b'
							/>
						</div>
					</motion.div>

					{/* ── CO₂ Equivalents ── */}
					<motion.div variants={slideUp}>
						<h2 className='text-sm font-bold text-[var(--color-ngo-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2'>
							<Leaf size={14} className='text-[var(--color-ngo-accent)]' /> CO₂ Impact Equals...
						</h2>
						<div className='space-y-2'>
							{CO2_EQUIVALENTS.map((eq) => {
								const equiv = Math.round(impact.totalCo2PreventedKg / eq.divisor)
								return (
									<div
										key={eq.label}
										className='rounded-[var(--radius-xl)] bg-white border border-[var(--color-ngo-border)] p-4 flex items-center gap-4'
									>
										<span className='w-10 flex items-center justify-center flex-shrink-0'>{eq.icon}</span>
										<div className='flex-1'>
											<p className='text-xs text-[var(--color-ngo-text-muted)]'>{eq.label}</p>
											<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-accent)]'>
												{equiv.toLocaleString()}
											</p>
										</div>
									</div>
								)
							})}
						</div>
					</motion.div>

					{/* ── Chart ── */}
					<motion.div variants={slideUp}>
						<div className='flex items-center justify-between mb-3'>
							<h2 className='text-sm font-bold text-[var(--color-ngo-text-secondary)] uppercase tracking-wider flex items-center gap-2'>
								<BarChart2 size={14} className='text-[var(--color-ngo-accent)]' /> Trend
							</h2>
							<div className='flex gap-1'>
								{(['weekly', 'monthly'] as const).map((v) => (
									<button
										key={v}
										onClick={() => setChartView(v)}
										className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
											chartView === v
												? 'bg-[var(--color-ngo-accent)] text-white'
												: 'bg-[var(--color-ngo-surface-elevated)] text-[var(--color-ngo-text-muted)]'
										}`}
									>
										{v === 'weekly' ? '7D' : '7M'}
									</button>
								))}
							</div>
						</div>

						<div className='rounded-[var(--radius-xl)] bg-white border border-[var(--color-ngo-border)] p-4'>
							{/* Metric selector */}
							<div className='flex gap-2 mb-4 flex-wrap'>
								{(Object.keys(metricConfig) as (keyof typeof metricConfig)[]).map((m) => (
									<button
										key={m}
										onClick={() => setChartMetric(m as typeof chartMetric)}
										className={`px-3 py-1 text-xs font-semibold rounded-full transition-all border ${
											chartMetric === m
												? 'border-transparent text-white'
												: 'bg-transparent text-[var(--color-ngo-text-muted)] border-[var(--color-ngo-border)]'
										}`}
										style={
											chartMetric === m
												? { backgroundColor: metricConfig[m].color }
												: {}
										}
									>
										{metricConfig[m].label}
									</button>
								))}
							</div>

							<BarChart
								data={chartData as Record<string, number | string>[]}
								valueKey={chartMetric}
								labelKey={labelKey}
								color={metricConfig[chartMetric].color}
							/>

							<p className='text-right text-xs text-[var(--color-ngo-text-muted)] mt-2'>
								{chartView === 'weekly' ? 'Last 7 days' : 'Last 7 months'}
							</p>
						</div>
					</motion.div>

					{/* ── Food Categories ── */}
					<motion.div variants={slideUp}>
						<h2 className='text-sm font-bold text-[var(--color-ngo-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2'>
							<Package size={14} className='text-[var(--color-ngo-accent)]' /> Food Categories
						</h2>
						<div className='rounded-[var(--radius-xl)] bg-white border border-[var(--color-ngo-border)] p-4 space-y-3'>
							{impact.topCategories.map((cat) => (
								<div key={cat.category}>
									<div className='flex justify-between items-center mb-1'>
										<span className='text-sm font-medium text-[var(--color-ngo-text-primary)]'>
											{cat.category}
										</span>
										<span className='text-sm font-bold text-[var(--color-ngo-accent)]'>
											{cat.percent}%
										</span>
									</div>
									<div className='h-2 bg-[var(--color-ngo-surface-elevated)] rounded-full overflow-hidden'>
										<motion.div
											initial={{ width: 0 }}
											animate={{ width: `${cat.percent}%` }}
											transition={{ type: 'spring', stiffness: 120, damping: 20, delay: 0.1 }}
											className='h-full bg-[var(--color-ngo-accent)] rounded-full'
										/>
									</div>
								</div>
							))}
						</div>
					</motion.div>

					{/* ── Recent History ── */}
					{history.length > 0 && (
						<motion.div variants={slideUp}>
							<h2 className='text-sm font-bold text-[var(--color-ngo-text-secondary)] uppercase tracking-wider mb-3 flex items-center gap-2'>
								<Calendar size={14} className='text-[var(--color-ngo-accent)]' /> Recent Pickups
							</h2>
							<div className='space-y-2'>
								{history.slice(0, 5).map((p) => (
									<div
										key={p.id}
										className='rounded-[var(--radius-xl)] bg-white border border-[var(--color-ngo-border)] p-4 flex items-center gap-3'
									>
										<div className='w-10 h-10 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 bg-[var(--color-ngo-bg)]'>
											<img
												src={p.donation.images[0]}
												alt={p.donation.foodName}
												className='w-full h-full object-cover'
											/>
										</div>
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-bold text-[var(--color-ngo-text-primary)] truncate'>
												{p.donation.foodName}
											</p>
											<p className='text-xs text-[var(--color-ngo-text-muted)]'>
												{p.donation.donorName} · {p.donation.quantityKg} kg
											</p>
										</div>
										<div className='text-right flex-shrink-0'>
											<Badge className='bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)] border-none text-[9px] font-bold hover:bg-[var(--color-ngo-accent-light)]'>
												+{p.mealsServed || p.donation.servings} meals
											</Badge>
										</div>
									</div>
								))}
							</div>
						</motion.div>
					)}
				</motion.div>
			</div>
		</div>
	)
}
