import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	ShieldAlert,
	ShieldCheck,
	CircleAlert,
	ClipboardCheck,
	Brain,
	CloudSunRain,
	ChevronRight,
	Clock3,
	MessageSquareWarning,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { useInspectorStore } from '@/stores/inspector-store'

function DashboardStat({
	icon,
	label,
	value,
	accent,
}: {
	icon: React.ReactNode
	label: string
	value: string
	accent: string
}) {
	return (
		<motion.div variants={fadeIn} className='h-full'>
			<Card className='h-full border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
				<CardContent className='p-4 h-full flex flex-col'>
					<div className='w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center mb-3' style={{ backgroundColor: `${accent}22`, color: accent }}>
						{icon}
					</div>
					<p className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] leading-tight'>
						{value}
					</p>
					<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>{label}</p>
				</CardContent>
			</Card>
		</motion.div>
	)
}

function RiskBadge({ level }: { level: 'low' | 'moderate' | 'high' | 'critical' }) {
	const map = {
		low: 'bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)]',
		moderate: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		high: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		critical: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}

	return (
		<Badge className={`border-none text-[10px] font-bold capitalize hover:opacity-100 ${map[level]}`}>
			{level}
		</Badge>
	)
}

export function InspectorDashboardPage() {
	const { stats, alerts, aiRiskDetections, weatherAlerts, listings, complaints } = useInspectorStore()

	const urgentListings = listings
		.filter((item) => item.urgency === 'expiring_6h' || item.urgency === 'expired')
		.slice(0, 4)

	const activeCases = complaints
		.filter((item) => item.status !== 'resolved' && item.status !== 'dismissed')
		.slice(0, 4)

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 px-4 md:px-6 pt-6 pb-8 max-w-7xl mx-auto'
		>
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-inspector-text-muted)]'>Food Safety Operations</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
					Compliance Dashboard
				</h1>
			</motion.div>

			<motion.div variants={staggerContainer} className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
				<DashboardStat
					icon={<ShieldAlert size={18} />}
					label='Listings Monitored'
					value={stats.totalListingsMonitored.toLocaleString()}
					accent='var(--color-inspector-accent)'
				/>
				<DashboardStat
					icon={<CircleAlert size={18} />}
					label='Flagged Listings'
					value={stats.flaggedListings.toLocaleString()}
					accent='var(--color-inspector-risk-high)'
				/>
				<DashboardStat
					icon={<MessageSquareWarning size={18} />}
					label='Active Investigations'
					value={stats.activeInvestigations.toLocaleString()}
					accent='var(--color-inspector-risk-critical)'
				/>
				<DashboardStat
					icon={<ShieldCheck size={18} />}
					label='Regional Compliance'
					value={`${stats.regionalComplianceScore}%`}
					accent='var(--color-inspector-risk-low)'
				/>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-1 xl:grid-cols-5 gap-4'>
				<Card className='xl:col-span-3 border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
					<CardContent className='p-4'>
						<div className='flex items-center justify-between mb-3'>
							<div className='flex items-center gap-2'>
								<Brain size={16} className='text-[var(--color-inspector-accent)]' />
								<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
									AI-Assisted Risk Detection
								</h3>
							</div>
							<Link to='/inspector/listings' className='text-xs text-[var(--color-inspector-accent)] font-semibold flex items-center gap-1 hover:underline'>
								Review <ChevronRight size={12} />
							</Link>
						</div>

						<div className='space-y-2.5'>
							{aiRiskDetections.slice(0, 2).map((item) => (
								<div key={item.id} className='rounded-[var(--radius-lg)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3'>
									<div className='flex items-start justify-between gap-2'>
										<div>
											<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)]'>{item.title}</p>
											<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>{item.summary}</p>
										</div>
										<RiskBadge level={item.riskLevel} />
									</div>
									<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-2'>
										Confidence: {Math.round(item.confidence * 100)}% · {item.recommendedAction}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className='xl:col-span-2 border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
					<CardContent className='p-4'>
						<div className='flex items-center gap-2 mb-3'>
							<CloudSunRain size={16} className='text-[var(--color-inspector-info)]' />
							<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
								Weather Risk Alerts
							</h3>
						</div>
						<div className='space-y-2.5'>
							{weatherAlerts.slice(0, 2).map((item) => (
								<div key={item.id} className='rounded-[var(--radius-lg)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3'>
									<div className='flex items-center justify-between gap-2'>
										<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)]'>{item.title}</p>
										<RiskBadge level={item.riskLevel} />
									</div>
									<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>{item.message}</p>
									<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-2'>
										Region: {item.region} · Action: {item.recommendedAction}
									</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
					<CardContent className='p-4'>
						<div className='flex items-center justify-between mb-3'>
							<div className='flex items-center gap-2'>
								<Clock3 size={16} className='text-[var(--color-inspector-risk-high)]' />
								<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
									Urgent Expiry Queue
								</h3>
							</div>
							<Link to='/inspector/listings' className='text-xs text-[var(--color-inspector-accent)] font-semibold hover:underline'>
								View all
							</Link>
						</div>

						<div className='space-y-2'>
							{urgentListings.length === 0 ? (
								<p className='text-xs text-[var(--color-inspector-text-muted)]'>No urgent listings right now.</p>
							) : (
								urgentListings.map((item) => (
									<div key={item.id} className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-3 bg-[var(--color-inspector-surface-elevated)]'>
										<div className='flex items-center justify-between gap-2'>
											<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)] truncate'>
												{item.foodName}
											</p>
											<RiskBadge level={item.riskLevel} />
										</div>
										<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
											{item.sourceName} · {item.region}
										</p>
										<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-2'>
											Expires {formatRelativeTime(new Date(item.expiresAt))}
										</p>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>

				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
					<CardContent className='p-4'>
						<div className='flex items-center justify-between mb-3'>
							<div className='flex items-center gap-2'>
								<ClipboardCheck size={16} className='text-[var(--color-inspector-risk-critical)]' />
								<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
									Active Cases
								</h3>
							</div>
							<Link to='/inspector/complaints' className='text-xs text-[var(--color-inspector-accent)] font-semibold hover:underline'>
								Open queue
							</Link>
						</div>

						<div className='space-y-2'>
							{activeCases.length === 0 ? (
								<p className='text-xs text-[var(--color-inspector-text-muted)]'>No active complaints.</p>
							) : (
								activeCases.map((item) => (
									<div key={item.id} className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-3 bg-[var(--color-inspector-surface-elevated)]'>
										<div className='flex items-center justify-between gap-2'>
											<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)] truncate'>
												{item.title}
											</p>
											<RiskBadge level={item.severity === 'critical' ? 'critical' : item.severity === 'high' ? 'high' : item.severity === 'medium' ? 'moderate' : 'low'} />
										</div>
										<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
											{item.submittedByName} · {item.region}
										</p>
										<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-2'>
											Status: {item.status.replace('_', ' ')}
										</p>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-card)] shadow-none'>
					<CardContent className='p-4 flex items-center justify-between gap-3'>
						<div>
							<p className='text-sm font-bold text-[var(--color-inspector-text-primary)]'>Safety Alerts</p>
							<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
								{alerts.filter((item) => !item.isResolved).length} unresolved alerts across assigned regions.
							</p>
						</div>
						<Button asChild className='bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white rounded-full'>
							<Link to='/inspector/listings'>Open Risk Queue</Link>
						</Button>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}
