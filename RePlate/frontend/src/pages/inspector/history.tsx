import { motion } from 'motion/react'
import { History, Shield, Gavel, ClipboardCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { useInspectorStore } from '@/stores/inspector-store'

export function InspectorHistoryPage() {
	const { enforcementLogs, fieldInspections, complaints } = useInspectorStore()

	const resolvedComplaints = complaints.filter((item) => item.status === 'resolved' || item.status === 'dismissed')

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-inspector-text-muted)]'>Audit Trail</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Inspection History</h1>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-1 md:grid-cols-3 gap-3'>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-inspector-accent-light)] text-[var(--color-inspector-accent)] flex items-center justify-center mb-2'>
							<ClipboardCheck className='w-4 h-4' />
						</div>
						<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>{fieldInspections.length}</p>
						<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>Field inspections logged</p>
					</CardContent>
				</Card>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)] flex items-center justify-center mb-2'>
							<History className='w-4 h-4' />
						</div>
						<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>{resolvedComplaints.length}</p>
						<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>Complaints resolved</p>
					</CardContent>
				</Card>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)] flex items-center justify-center mb-2'>
							<Gavel className='w-4 h-4' />
						</div>
						<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>{enforcementLogs.length}</p>
						<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>Enforcement actions</p>
					</CardContent>
				</Card>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-3'>Recent Enforcement Logs</h3>
						<div className='space-y-2'>
							{enforcementLogs.slice(0, 8).map((item) => (
								<div key={item.id} className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3'>
									<div className='flex items-center justify-between gap-2'>
										<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)]'>{item.action.replace(/_/g, ' ')}</p>
										<Badge className='text-[10px] border-none bg-[var(--color-inspector-surface)] text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface)]'>
											{item.targetType.replace(/_/g, ' ')}
										</Badge>
									</div>
									<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>{item.reason}</p>
									<p className='text-[11px] text-[var(--color-inspector-text-disabled)] mt-2'>{formatRelativeTime(new Date(item.createdAt))}</p>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-3'>Resolved Complaint Outcomes</h3>
						<div className='space-y-2'>
							{resolvedComplaints.slice(0, 8).map((item) => (
								<div key={item.id} className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3'>
									<div className='flex items-center justify-between gap-2'>
										<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)]'>{item.title}</p>
										<Badge className='text-[10px] border-none bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)] hover:bg-[var(--color-inspector-risk-low-light)]'>
											{item.status}
										</Badge>
									</div>
									<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
										{item.resolutionSummary || 'No summary provided.'}
									</p>
									{item.actionTaken && (
										<p className='text-[11px] text-[var(--color-inspector-text-secondary)] mt-2'>Action: {item.actionTaken.replace(/_/g, ' ')}</p>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}
