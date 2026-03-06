import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface ImpactStatCardProps {
	icon: LucideIcon
	label: string
	value: string
	subtitle?: string
	color?: 'accent' | 'eco' | 'warning' | 'info'
}

const colorMap = {
	accent: {
		bg: 'bg-[var(--color-brand-accent-light)]',
		icon: 'text-[var(--color-brand-accent)]',
		value: 'text-[var(--color-brand-accent)]',
	},
	eco: {
		bg: 'bg-[var(--color-eco-muted)]',
		icon: 'text-[var(--color-eco)]',
		value: 'text-[var(--color-eco)]',
	},
	warning: {
		bg: 'bg-[var(--color-warning-light)]',
		icon: 'text-[var(--color-warning)]',
		value: 'text-[var(--color-warning)]',
	},
	info: {
		bg: 'bg-[var(--color-info-light)]',
		icon: 'text-[var(--color-info)]',
		value: 'text-[var(--color-info)]',
	},
}

export function ImpactStatCard({ icon: Icon, label, value, subtitle, color = 'eco' }: ImpactStatCardProps) {
	const colors = colorMap[color]

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			className='flex flex-col gap-3 p-4 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)]'
		>
			<div className={cn('w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center', colors.bg)}>
				<Icon size={20} className={colors.icon} />
			</div>
			<div>
				<p className={cn('text-2xl font-bold font-[var(--font-display)]', colors.value)}>{value}</p>
				<p className='text-sm font-medium text-[var(--color-text-primary)] mt-0.5'>{label}</p>
				{subtitle && (
					<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>{subtitle}</p>
				)}
			</div>
		</motion.div>
	)
}
