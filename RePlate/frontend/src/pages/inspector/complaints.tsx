import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Search, MessageSquareWarning, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { useInspectorStore } from '@/stores/inspector-store'
import { ComplaintTriagePanel } from '@/components/ai/ComplaintTriagePanel'

function SeverityPill({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
	const cls = {
		low: 'bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)]',
		medium: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		high: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		critical: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}
	return <Badge className={`border-none text-[10px] font-bold capitalize hover:opacity-100 ${cls[level]}`}>{level}</Badge>
}

export function InspectorComplaintsPage() {
	const { complaints } = useInspectorStore()
	const [tab, setTab] = useState<'active' | 'resolved'>('active')
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		return complaints
			.filter((item) => {
				const active = item.status !== 'resolved' && item.status !== 'dismissed'
				if (tab === 'active' && !active) return false
				if (tab === 'resolved' && active) return false

				const q = query.trim().toLowerCase()
				if (!q) return true
				return (
					item.title.toLowerCase().includes(q) ||
					item.submittedByName.toLowerCase().includes(q) ||
					item.region.toLowerCase().includes(q)
				)
			})
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
	}, [complaints, query, tab])

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-inspector-text-muted)]'>Incident Workflow</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Complaints & Incidents</h1>
			</motion.div>

			<motion.div variants={slideUp} className='rounded-[var(--radius-xl)] border border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] p-3 md:p-4 space-y-3'>
				<div className='flex p-1 bg-[var(--color-inspector-surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-inspector-border)]'>
					<button
						onClick={() => setTab('active')}
						className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-all ${tab === 'active' ? 'bg-white text-[var(--color-inspector-accent)] shadow-sm' : 'text-[var(--color-inspector-text-muted)]'}`}
					>
						Active Cases
					</button>
					<button
						onClick={() => setTab('resolved')}
						className={`flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-all ${tab === 'resolved' ? 'bg-white text-[var(--color-inspector-accent)] shadow-sm' : 'text-[var(--color-inspector-text-muted)]'}`}
					>
						Resolved
					</button>
				</div>

				<div className='relative'>
					<Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-inspector-text-muted)]' />
					<Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder='Search by title, region, or reporter...' className='pl-9 bg-[var(--color-inspector-surface-elevated)] border-[var(--color-inspector-border-subtle)]' />
				</div>
			</motion.div>

			<motion.div variants={staggerContainer} className='space-y-3'>
				{filtered.length === 0 ? (
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-6 text-center'>
							<p className='text-sm text-[var(--color-inspector-text-muted)]'>No complaints in this view.</p>
						</CardContent>
					</Card>
				) : (
					filtered.map((item) => (
						<motion.div key={item.id} variants={slideUp}>
							<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
								<CardContent className='p-4'>
									<div className='flex items-start justify-between gap-3'>
										<div className='min-w-0'>
											<div className='flex items-center gap-2 flex-wrap'>
												<p className='text-base font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] truncate'>{item.title}</p>
												<SeverityPill level={item.severity} />
												<Badge className='border-none text-[10px] font-bold bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface-elevated)]'>
													{item.status.replace('_', ' ')}
												</Badge>
											</div>
											<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
												{item.submittedByName} ({item.submittedByType}) · {item.region}
											</p>
											<p className='text-xs text-[var(--color-inspector-text-secondary)] mt-1 line-clamp-2'>{item.description}</p>
											<p className='text-[11px] text-[var(--color-inspector-text-muted)] mt-2'>
												Updated {formatRelativeTime(new Date(item.updatedAt))}
											</p>
										</div>
										<Button asChild className='bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white h-9'>
											<Link to={`/inspector/complaints/${item.id}`}>
												Open <ChevronRight className='w-4 h-4 ml-1' />
											</Link>
										</Button>
									</div>
									<ComplaintTriagePanel
										complaintText={item.description}
										complaintType='hygiene'
										complaintId={item.id}
									/>
								</CardContent>
							</Card>
						</motion.div>
					))
				)}
			</motion.div>

			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4 flex items-center justify-between gap-3'>
						<div className='flex items-start gap-2'>
							<MessageSquareWarning className='w-4 h-4 mt-0.5 text-[var(--color-inspector-risk-critical)]' />
							<p className='text-xs text-[var(--color-inspector-text-muted)]'>Enforcement actions should include clear rationale and evidence references.</p>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>
	)
}
