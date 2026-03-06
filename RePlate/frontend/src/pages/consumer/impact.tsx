import { motion } from 'motion/react'
import {
	Leaf,
	Flame,
	TrendingUp,
	Package,
	DollarSign,
	BarChart3,
	Award,
	Zap,
	TreePine,
	Sprout,
	Car,
	Lightbulb,
	Loader2,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ImpactStatCard } from '@/components/common/impact-stat-card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatCurrency, cn, carKmEquivalent, treesEquivalent, ledHoursEquivalent } from '@/lib/utils'
import { impactApi } from '@/lib/api'
import { mapImpactStatsOut } from '@/lib/mappers'
import type { ImpactLevel } from '@/types'
import type { LucideIcon } from 'lucide-react'

const levelConfig: Record<ImpactLevel, { label: string; icon: LucideIcon; color: string; bg: string; next: string | null; threshold: number | null }> = {
	seedling: { label: 'Seedling', icon: Sprout, color: 'text-[var(--color-text-muted)]', bg: 'bg-[var(--color-border-subtle)]', next: 'Sprout', threshold: 10 },
	sprout: { label: 'Sprout', icon: Sprout, color: 'text-[var(--color-eco)]', bg: 'bg-[var(--color-eco-muted)]', next: 'Sapling', threshold: 25 },
	sapling: { label: 'Sapling', icon: Leaf, color: 'text-[var(--color-eco)]', bg: 'bg-[var(--color-eco-muted)]', next: 'Tree', threshold: 50 },
	tree: { label: 'Tree', icon: TreePine, color: 'text-[var(--color-eco)]', bg: 'bg-[var(--color-eco-muted)]', next: 'Forest', threshold: 100 },
	forest: { label: 'Forest', icon: TreePine, color: 'text-[var(--color-eco)]', bg: 'bg-[var(--color-eco-muted)]', next: null, threshold: null },
}

export function ImpactPage() {
	const { data: impact, isLoading } = useQuery({
		queryKey: ['impact'],
		queryFn: async () => {
			const { data } = await impactApi.getMyImpact()
			return mapImpactStatsOut(data)
		},
	})

	if (isLoading || !impact) {
		return (
			<div className='flex items-center justify-center py-20'>
				<Loader2 size={28} className='animate-spin text-[var(--color-brand-accent)]' />
			</div>
		)
	}

	const level = levelConfig[impact.level]
	const LevelIcon = level.icon
	const BAR_MAX = Math.max(...impact.monthlyData.map((d) => d.co2Saved), 1)

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-6 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp}>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					Your Impact
				</h1>
				<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>
					Every order makes a difference
				</p>
			</motion.div>

			{/* Hero — Level card */}
			<motion.div
				variants={slideUp}
				className='relative overflow-hidden rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--color-eco)] to-[#0d5c2e] p-5 text-white shadow-[var(--shadow-elevated)]'
			>
				{/* Background decoration */}
				<div className='absolute top-0 right-0 w-40 h-40 rounded-full bg-white/5 -translate-y-12 translate-x-12' />
				<div className='absolute bottom-0 left-0 w-28 h-28 rounded-full bg-white/5 translate-y-10 -translate-x-8' />

				<div className='relative z-10'>
					<div className='flex items-start justify-between'>
						<div>
							<p className='text-xs text-green-200 font-medium'>Current Level</p>
							<div className='flex items-center gap-2 mt-1'>
								<div className='w-8 h-8 rounded-full bg-white/20 flex items-center justify-center'>
									<LevelIcon size={18} className='text-white' />
								</div>
								<h2 className='text-2xl font-bold font-[var(--font-display)]'>{level.label}</h2>
							</div>
						</div>
						<div className='flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-full'>
							<Flame size={14} className='text-orange-300' />
							<span className='text-sm font-bold'>{impact.streak} day streak</span>
						</div>
					</div>

					{/* Progress to next level */}
					{level.next && (
						<div className='mt-4'>
							<div className='flex items-center justify-between text-xs text-green-200 mb-1.5'>
								<span>{level.label}</span>
								<span>{level.next}</span>
							</div>
							<div className='h-2 bg-white/20 rounded-full overflow-hidden'>
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${impact.nextLevelProgress}%` }}
									transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
									className='h-full bg-white rounded-full'
								/>
							</div>
							<p className='text-xs text-green-200 mt-1.5'>
								{impact.nextLevelProgress}% to {level.next}
							</p>
						</div>
					)}

					<div className='mt-4 flex items-center gap-1 text-sm text-green-200'>
						<Award size={14} />
						<span>Total: {impact.totalOrders} orders rescued</span>
					</div>
				</div>
			</motion.div>

			{/* Stats grid */}
			<motion.div variants={slideUp} className='grid grid-cols-2 gap-3'>
				<ImpactStatCard
					icon={Leaf}
					label='CO₂ Saved'
					value={`${impact.totalCo2Saved} kg`}
					subtitle='Since you joined'
					color='eco'
				/>
				<ImpactStatCard
					icon={DollarSign}
					label='Money Saved'
					value={formatCurrency(impact.totalMoneySaved)}
					subtitle='Total discounts'
					color='accent'
				/>
				<ImpactStatCard
					icon={Package}
					label='Meals Rescued'
					value={`${impact.totalMealsRescued}`}
					subtitle='From going to waste'
					color='eco'
				/>
				<ImpactStatCard
					icon={TrendingUp}
					label='Food Saved'
					value={`${impact.totalFoodWeightSaved} kg`}
					subtitle='Total food weight'
					color='warning'
				/>
			</motion.div>

			{/* Monthly CO₂ bar chart */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<div className='flex items-center gap-2 mb-4'>
					<BarChart3 size={16} className='text-[var(--color-eco)]' />
					<h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Monthly CO₂ Saved (kg)</h2>
				</div>

				{/* Bar chart */}
				<div className='flex items-end gap-2 h-32'>
					{impact.monthlyData.map((d, i) => {
						const heightPct = BAR_MAX > 0 ? (d.co2Saved / BAR_MAX) * 100 : 0
						const isLatest = i === impact.monthlyData.length - 1
						return (
							<div key={d.month} className='flex-1 flex flex-col items-center gap-1'>
								<motion.div
									initial={{ height: 0 }}
									animate={{ height: `${heightPct}%` }}
									transition={{ duration: 0.6, delay: i * 0.07, ease: 'easeOut' }}
									className={cn(
										'w-full rounded-t-[4px] min-h-[4px]',
										isLatest
											? 'bg-[var(--color-brand-accent)]'
											: 'bg-[var(--color-eco-light)]',
									)}
								/>
								<span className='text-[10px] text-[var(--color-text-muted)] font-medium'>{d.month}</span>
							</div>
						)
					})}
				</div>
			</motion.div>

			{/* Monthly table */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				<div className='px-4 py-3 border-b border-[var(--color-border-subtle)]'>
					<h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Monthly Breakdown</h2>
				</div>
				<div className='divide-y divide-[var(--color-border-subtle)]'>
					{[...impact.monthlyData].reverse().map((d) => (
						<div key={d.month} className='flex items-center px-4 py-3 gap-3'>
							<div className='w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-eco-muted)] flex items-center justify-center flex-shrink-0'>
								<span className='text-xs font-bold text-[var(--color-eco)]'>{d.month}</span>
							</div>
							<div className='flex-1 grid grid-cols-2 gap-x-3 gap-y-0.5'>
								<div>
									<p className='text-[10px] text-[var(--color-text-muted)]'>CO₂</p>
									<p className='text-xs font-semibold text-[var(--color-eco)]'>{d.co2Saved} kg</p>
								</div>
								<div>
									<p className='text-[10px] text-[var(--color-text-muted)]'>Saved</p>
									<p className='text-xs font-semibold text-[var(--color-brand-accent)]'>{formatCurrency(d.moneySaved)}</p>
								</div>
								<div>
									<p className='text-[10px] text-[var(--color-text-muted)]'>Orders</p>
									<p className='text-xs font-semibold text-[var(--color-text-primary)]'>{d.ordersCount}</p>
								</div>
								<div>
									<p className='text-[10px] text-[var(--color-text-muted)]'>Food rescued</p>
									<p className='text-xs font-semibold text-[var(--color-text-primary)]'>{d.foodWeightSaved} kg</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</motion.div>

			{/* Fun equivalents */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<div className='flex items-center gap-2 mb-3'>
					<Zap size={15} className='text-[var(--color-brand-accent)]' />
					<h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Your CO₂ savings equal...</h2>
				</div>
				<div className='grid grid-cols-3 gap-3'>
					{[
						{ icon: Car, value: `${Math.round(carKmEquivalent(impact.totalCo2Saved))} km`, label: 'not driven', color: 'text-[var(--color-text-muted)]' },
						{ icon: TreePine, value: `${treesEquivalent(impact.totalCo2Saved).toFixed(1)}`, label: 'trees/year', color: 'text-[var(--color-eco)]' },
						{ icon: Lightbulb, value: `${Math.round(ledHoursEquivalent(impact.totalCo2Saved))}h`, label: 'of LED light', color: 'text-amber-400' },
					].map((item) => (
						<div
							key={item.label}
							className='flex flex-col items-center gap-1.5 p-3 bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)] text-center'
						>
							<item.icon size={22} className={item.color} />
							<p className='text-sm font-bold text-[var(--color-text-primary)]'>{item.value}</p>
							<p className='text-[10px] text-[var(--color-text-muted)]'>{item.label}</p>
						</div>
					))}
				</div>
			</motion.div>
		</motion.div>
	)
}
