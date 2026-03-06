import { motion } from 'motion/react'
import { ShieldCheck, CircleX, Activity, MapPinned } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { useInspectorStore } from '@/stores/inspector-store'

function ImpactStat({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
	return (
		<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none h-full'>
			<CardContent className='p-4 h-full'>
				<p className='text-xs text-[var(--color-inspector-text-muted)]'>{label}</p>
				<p className='text-2xl font-bold font-[var(--font-display)] mt-1' style={{ color: accent }}>{value}</p>
				<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-1'>{hint}</p>
			</CardContent>
		</Card>
	)
}

export function InspectorImpactPage() {
	const { stats } = useInspectorStore()

	const safeVsRejected = [
		{ label: 'Safe', value: stats.verifiedSafeListings, color: 'var(--color-inspector-risk-low)' },
		{ label: 'Rejected', value: stats.rejectedUnsafeListings, color: 'var(--color-inspector-risk-critical)' },
	]

	const maxBar = Math.max(...safeVsRejected.map((item) => item.value), 1)

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-inspector-text-muted)]'>Outcome Analytics</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Safety Impact</h1>
			</motion.div>

			<motion.div variants={staggerContainer} className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
				<motion.div variants={fadeIn}><ImpactStat label='Safe Listings' value={stats.verifiedSafeListings.toLocaleString()} hint='Approved and compliant' accent='var(--color-inspector-risk-low)' /></motion.div>
				<motion.div variants={fadeIn}><ImpactStat label='Unsafe Rejections' value={stats.rejectedUnsafeListings.toLocaleString()} hint='Removed before redistribution' accent='var(--color-inspector-risk-critical)' /></motion.div>
				<motion.div variants={fadeIn}><ImpactStat label='Incidents Prevented' value={stats.incidentsPrevented.toLocaleString()} hint='Proactive risk interventions' accent='var(--color-inspector-accent)' /></motion.div>
				<motion.div variants={fadeIn}><ImpactStat label='Compliance Score' value={`${stats.regionalComplianceScore}%`} hint='Regional food safety index' accent='var(--color-inspector-info)' /></motion.div>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-3'>Verification Outcomes</h3>
						<div className='space-y-3'>
							{safeVsRejected.map((item) => (
								<div key={item.label}>
									<div className='flex items-center justify-between text-xs mb-1'>
										<span className='font-semibold text-[var(--color-inspector-text-primary)]'>{item.label}</span>
										<span className='text-[var(--color-inspector-text-muted)]'>{item.value}</span>
									</div>
									<div className='h-2 rounded-full bg-[var(--color-inspector-surface-elevated)] overflow-hidden'>
										<div className='h-full rounded-full' style={{ width: `${(item.value / maxBar) * 100}%`, backgroundColor: item.color }} />
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4 space-y-3'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Inspection Health Snapshot</h3>
						<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3 flex items-start gap-2'>
							<ShieldCheck className='w-4 h-4 mt-0.5 text-[var(--color-inspector-risk-low)]' />
							<p className='text-xs text-[var(--color-inspector-text-secondary)]'>
								Most monitored listings remain compliant, with strong approval throughput in assigned zones.
							</p>
						</div>
						<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3 flex items-start gap-2'>
							<CircleX className='w-4 h-4 mt-0.5 text-[var(--color-inspector-risk-critical)]' />
							<p className='text-xs text-[var(--color-inspector-text-secondary)]'>
								Unsafe listings are being filtered early, reducing complaint escalation downstream.
							</p>
						</div>
						<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3 flex items-start gap-2'>
							<Activity className='w-4 h-4 mt-0.5 text-[var(--color-inspector-info)]' />
							<p className='text-xs text-[var(--color-inspector-text-secondary)]'>
								Continue focused audits on near-expiry high-volume meal listings for maximum risk reduction.
							</p>
						</div>
						<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3 flex items-start gap-2'>
							<MapPinned className='w-4 h-4 mt-0.5 text-[var(--color-inspector-accent)]' />
							<p className='text-xs text-[var(--color-inspector-text-secondary)]'>
								Regional compliance is currently {stats.regionalComplianceScore}%, showing stable food safety posture.
							</p>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}
