import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ClipboardCheck, Plus, X, CalendarDays, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp } from '@/lib/motion'
import { useInspectorStore } from '@/stores/inspector-store'
import { useInspectorUIStore } from '@/stores/inspector-ui-store'
import { formatDateIST } from '@/lib/utils'

export function InspectorInspectionsPage() {
	const { fieldInspections, addFieldInspection, profile } = useInspectorStore()
	const { newInspectionModalOpen, setNewInspectionModalOpen } = useInspectorUIStore()

	const [entityName, setEntityName] = useState('')
	const [region, setRegion] = useState(profile.assignedRegions[0] ?? '')
	const [location, setLocation] = useState('')
	const [rating, setRating] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'critical'>('good')
	const [recommendation, setRecommendation] = useState('')
	const [violation, setViolation] = useState('')

	const handleSaveInspection = () => {
		if (!entityName.trim() || !region.trim() || !location.trim()) return

		addFieldInspection({
			inspectorId: profile.id,
			entityType: 'seller',
			entityId: `entity-${Date.now()}`,
			entityName,
			region,
			location,
			inspectionDate: new Date().toISOString(),
			hygieneRating: rating,
			violations: violation.trim()
				? [
					{
						id: `vio-${Date.now()}`,
						type: 'hygiene',
						severity: rating === 'critical' || rating === 'poor' ? 'high' : 'moderate',
						description: violation,
						recommendation: recommendation || 'Immediate corrective action required.',
						actionRequired: true,
					},
				]
				: [],
			recommendations: recommendation.trim() ? [recommendation] : ['Maintain standard food safety procedures.'],
			nextInspectionDue: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
			trustScoreImpact: rating === 'excellent' ? 4 : rating === 'good' ? 2 : rating === 'fair' ? -2 : -6,
		})

		setEntityName('')
		setLocation('')
		setRecommendation('')
		setViolation('')
		setRating('good')
		setNewInspectionModalOpen(false)
	}

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<motion.div variants={slideUp} className='flex items-start justify-between gap-3'>
				<div>
					<p className='text-sm text-[var(--color-inspector-text-muted)]'>On-ground Verification</p>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Field Inspections</h1>
				</div>
				<Button onClick={() => setNewInspectionModalOpen(true)} className='bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white rounded-full'>
					<Plus className='w-4 h-4 mr-1.5' /> New Inspection
				</Button>
			</motion.div>

			<motion.div variants={staggerContainer} className='space-y-3'>
				{fieldInspections.map((item) => (
					<motion.div key={item.id} variants={slideUp}>
						<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
							<CardContent className='p-4'>
								<div className='flex items-start justify-between gap-3'>
									<div>
										<p className='text-base font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>{item.entityName}</p>
										<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>{item.location} · {item.region}</p>
									</div>
									<Badge className='border-none text-[10px] font-bold capitalize bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface-elevated)]'>
										{item.hygieneRating}
									</Badge>
								</div>

								<div className='grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3'>
									<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
										<div className='flex items-center gap-1 text-[11px] text-[var(--color-inspector-text-muted)]'><CalendarDays className='w-3.5 h-3.5' />Inspected On</div>
										<p className='text-xs font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{formatDateIST(new Date(item.inspectionDate))}</p>
									</div>
									<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
										<div className='flex items-center gap-1 text-[11px] text-[var(--color-inspector-text-muted)]'><ClipboardCheck className='w-3.5 h-3.5' />Violations</div>
										<p className='text-xs font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{item.violations.length}</p>
									</div>
									<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
										<div className='flex items-center gap-1 text-[11px] text-[var(--color-inspector-text-muted)]'><Building2 className='w-3.5 h-3.5' />Trust Score Impact</div>
										<p className='text-xs font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{item.trustScoreImpact > 0 ? '+' : ''}{item.trustScoreImpact}</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</motion.div>
				))}
			</motion.div>

			<AnimatePresence>
				{newInspectionModalOpen && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className='fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4'>
						<motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className='w-full md:max-w-xl bg-white rounded-t-[var(--radius-2xl)] md:rounded-[var(--radius-2xl)] border border-[var(--color-inspector-border)] shadow-2xl p-4 md:p-5 space-y-3'>
							<div className='flex items-center justify-between'>
								<h3 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>New Field Inspection</h3>
								<Button variant='ghost' size='icon' onClick={() => setNewInspectionModalOpen(false)}><X className='w-4 h-4' /></Button>
							</div>

							<Input value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder='Entity name (seller / donor)' className='border-[var(--color-inspector-border-subtle)]' />
							<div className='grid grid-cols-2 gap-2'>
								<Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder='Region' className='border-[var(--color-inspector-border-subtle)]' />
								<select value={rating} onChange={(event) => setRating(event.target.value as typeof rating)} className='h-10 rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] px-2.5 text-sm text-[var(--color-inspector-text-secondary)]'>
									<option value='excellent'>Excellent</option>
									<option value='good'>Good</option>
									<option value='fair'>Fair</option>
									<option value='poor'>Poor</option>
									<option value='critical'>Critical</option>
								</select>
							</div>
							<Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder='Inspection location' className='border-[var(--color-inspector-border-subtle)]' />
							<Textarea value={violation} onChange={(event) => setViolation(event.target.value)} placeholder='Violation observed (optional)' className='min-h-[80px] border-[var(--color-inspector-border-subtle)]' />
							<Textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} placeholder='Recommendation / corrective action' className='min-h-[80px] border-[var(--color-inspector-border-subtle)]' />

							<div className='flex gap-2'>
								<Button variant='outline' className='flex-1 border-[var(--color-inspector-border)]' onClick={() => setNewInspectionModalOpen(false)}>Cancel</Button>
								<Button className='flex-1 bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white' onClick={handleSaveInspection}>Save Record</Button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	)
}
