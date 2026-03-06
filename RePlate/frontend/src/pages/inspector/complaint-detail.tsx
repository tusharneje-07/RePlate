import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowLeft, CircleCheckBig, SearchCheck, ShieldBan, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useInspectorStore } from '@/stores/inspector-store'
import { formatRelativeTime } from '@/lib/utils'

function SeverityPill({ level }: { level: 'low' | 'medium' | 'high' | 'critical' }) {
	const cls = {
		low: 'bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)]',
		medium: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		high: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		critical: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}
	return <Badge className={`border-none text-[10px] font-bold capitalize hover:opacity-100 ${cls[level]}`}>{level}</Badge>
}

export function InspectorComplaintDetailPage() {
	const { complaintId } = useParams()
	const navigate = useNavigate()
	const { complaints, startInvestigation, resolveComplaint, logEnforcementAction, profile } = useInspectorStore()
	const [note, setNote] = useState('')

	const complaint = useMemo(() => complaints.find((item) => item.id === complaintId), [complaintId, complaints])

	if (!complaint) {
		return (
			<div className='min-h-[70vh] flex items-center justify-center px-4'>
				<Card className='max-w-lg w-full border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)]'>
					<CardContent className='p-6 text-center'>
						<p className='text-[var(--color-inspector-text-muted)] text-sm'>Complaint not found.</p>
						<Button className='mt-3' onClick={() => navigate('/inspector/complaints')}>Back to complaints</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const handleInvestigate = () => {
		startInvestigation(complaint.id, note || 'Investigation started by inspector.')
		navigate('/inspector/complaints')
	}

	const handleResolve = () => {
		resolveComplaint(complaint.id, note || 'Issue reviewed and resolved with documented corrective action.', 'warning_notice')
		logEnforcementAction({
			inspectorId: profile.id,
			targetType: complaint.listingId ? 'listing' : 'seller_account',
			targetId: complaint.listingId ?? complaint.id,
			action: 'warning_notice',
			reason: note || 'Complaint resolved with warning notice.',
		})
		navigate('/inspector/complaints')
	}

	const handleSuspend = () => {
		resolveComplaint(complaint.id, note || 'Escalated to temporary listing suspension.', 'listing_suspension')
		logEnforcementAction({
			inspectorId: profile.id,
			targetType: complaint.listingId ? 'listing' : 'seller_account',
			targetId: complaint.listingId ?? complaint.id,
			action: 'listing_suspension',
			reason: note || 'Suspension applied based on complaint evidence.',
		})
		navigate('/inspector/complaints')
	}

	return (
		<div className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<div className='flex items-center gap-3'>
				<Button variant='ghost' size='icon' onClick={() => navigate('/inspector/complaints')} className='text-[var(--color-inspector-text-muted)]'>
					<ArrowLeft className='w-5 h-5' />
				</Button>
				<div>
					<p className='text-xs text-[var(--color-inspector-text-muted)]'>Complaint Investigation</p>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
						{complaint.title}
					</h1>
				</div>
			</div>

			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
				<div className='xl:col-span-2 space-y-4'>
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4 space-y-3'>
							<div className='flex items-center gap-2 flex-wrap'>
								<SeverityPill level={complaint.severity} />
								<Badge className='border-none text-[10px] font-bold bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface-elevated)]'>
									{complaint.status.replace('_', ' ')}
								</Badge>
							</div>

							<div className='text-xs text-[var(--color-inspector-text-muted)]'>
								<p>Reported by: {complaint.submittedByName} ({complaint.submittedByType})</p>
								<p>Region: {complaint.region}</p>
								<p>Last updated: {formatRelativeTime(new Date(complaint.updatedAt))}</p>
							</div>

							<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-3'>
								<p className='text-xs font-semibold text-[var(--color-inspector-text-muted)] mb-1'>Complaint Description</p>
								<p className='text-sm text-[var(--color-inspector-text-secondary)]'>{complaint.description}</p>
							</div>

							{complaint.evidenceUrls.length > 0 && (
								<div className='space-y-2'>
									<p className='text-xs font-semibold text-[var(--color-inspector-text-muted)] uppercase tracking-wide'>Evidence</p>
									<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
										{complaint.evidenceUrls.map((url, index) => (
											<img key={`${url}-${index}`} src={url} alt='Complaint evidence' className='w-full h-36 object-cover rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)]' />
										))}
									</div>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				<div className='space-y-4'>
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4 space-y-3'>
							<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Action Panel</h3>
							<Textarea
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder='Add investigation notes, evidence summary, and action rationale...'
								className='min-h-[120px] bg-[var(--color-inspector-surface-elevated)] border-[var(--color-inspector-border-subtle)]'
							/>

							<div className='space-y-2'>
								<Button onClick={handleInvestigate} variant='outline' className='w-full border-[var(--color-inspector-info)] text-[var(--color-inspector-info)] hover:bg-[var(--color-inspector-info-light)]'>
									<SearchCheck className='w-4 h-4 mr-2' /> Start Investigation
								</Button>
								<Button onClick={handleResolve} className='w-full bg-[var(--color-inspector-risk-low)] hover:bg-[var(--color-inspector-risk-low)]/90 text-white'>
									<CircleCheckBig className='w-4 h-4 mr-2' /> Resolve with Warning
								</Button>
								<Button onClick={handleSuspend} variant='outline' className='w-full border-[var(--color-inspector-risk-critical)] text-[var(--color-inspector-risk-critical)] hover:bg-[var(--color-inspector-risk-critical-light)]'>
									<ShieldBan className='w-4 h-4 mr-2' /> Apply Suspension
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4'>
							<div className='flex items-start gap-2 text-xs text-[var(--color-inspector-text-muted)]'>
								<AlertTriangle className='w-4 h-4 mt-0.5 text-[var(--color-inspector-risk-high)]' />
								<span>All complaint outcomes must be traceable to evidence and logged enforcement actions.</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</motion.div>
		</div>
	)
}
