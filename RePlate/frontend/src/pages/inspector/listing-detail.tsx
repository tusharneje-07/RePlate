import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	ArrowLeft,
	ShieldAlert,
	CircleCheckBig,
	MessageCircleWarning,
	Info,
	Ban,
	Clock3,
	Thermometer,
	Package,
	Utensils,
	MapPin,
	Building2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useInspectorStore } from '@/stores/inspector-store'
import { formatRelativeTime, formatDateTimeIST } from '@/lib/utils'

function RiskBadge({ level }: { level: 'low' | 'moderate' | 'high' | 'critical' }) {
	const cls = {
		low: 'bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)]',
		moderate: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		high: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		critical: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}
	return <Badge className={`border-none text-[10px] font-bold capitalize hover:opacity-100 ${cls[level]}`}>{level}</Badge>
}

function statusLabel(status: string) {
	return status.replace(/_/g, ' ')
}

export function InspectorListingDetailPage() {
	const { listingId } = useParams()
	const navigate = useNavigate()
	const { listings, profile, updateListingStatus, requestListingInfo, logEnforcementAction } = useInspectorStore()
	const [note, setNote] = useState('')

	const listing = useMemo(() => listings.find((item) => item.id === listingId), [listingId, listings])

	if (!listing) {
		return (
			<div className='min-h-[70vh] flex items-center justify-center px-4'>
				<Card className='max-w-lg w-full border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)]'>
					<CardContent className='p-6 text-center'>
						<p className='text-[var(--color-inspector-text-muted)] text-sm'>Listing not found.</p>
						<Button className='mt-3' onClick={() => navigate('/inspector/listings')}>Back to queue</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	const handleApprove = () => {
		updateListingStatus(listing.id, 'approved', note || 'Safety declaration verified and approved.')
		navigate('/inspector/listings')
	}

	const handleFlag = () => {
		updateListingStatus(listing.id, 'under_review', note || 'Flagged for additional compliance review.')
		navigate('/inspector/listings')
	}

	const handleRequestInfo = () => {
		requestListingInfo(listing.id, note || 'Provide additional hygiene evidence and storage logs.')
		navigate('/inspector/listings')
	}

	const handleDisable = () => {
		const reason = note || 'Unsafe expiry/storage declaration. Temporarily disabled by inspector.'
		updateListingStatus(listing.id, 'temporarily_disabled', reason)
		logEnforcementAction({
			inspectorId: profile.id,
			targetType: 'listing',
			targetId: listing.id,
			action: 'listing_suspension',
			reason,
		})
		navigate('/inspector/listings')
	}

	return (
		<div className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-6xl mx-auto'>
			<div className='flex items-center gap-3'>
				<Button variant='ghost' size='icon' onClick={() => navigate('/inspector/listings')} className='text-[var(--color-inspector-text-muted)]'>
					<ArrowLeft className='w-5 h-5' />
				</Button>
				<div>
					<p className='text-xs text-[var(--color-inspector-text-muted)]'>Safety Verification</p>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
						{listing.foodName}
					</h1>
				</div>
			</div>

			<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
				<div className='xl:col-span-2 space-y-4'>
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4 space-y-3'>
							<div className='flex items-start justify-between gap-3'>
								<div>
									<div className='flex items-center gap-2 flex-wrap'>
										<p className='text-base font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>
											{listing.foodName}
										</p>
										<RiskBadge level={listing.riskLevel} />
										<Badge className='text-[10px] font-bold border-none bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)]'>
											{statusLabel(listing.status)}
										</Badge>
									</div>
									<p className='text-xs text-[var(--color-inspector-text-muted)] mt-1'>
										{listing.sourceName} · {listing.sourceType} · {listing.region}
									</p>
								</div>
								<Link to='/inspector/listings' className='text-xs text-[var(--color-inspector-accent)] font-semibold hover:underline'>
									Back to queue
								</Link>
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm'>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
									<div className='flex items-center gap-1.5 text-[var(--color-inspector-text-muted)] text-xs'><Clock3 className='w-3.5 h-3.5' />Expiry</div>
									<p className='font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{formatRelativeTime(new Date(listing.expiresAt))}</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
									<div className='flex items-center gap-1.5 text-[var(--color-inspector-text-muted)] text-xs'><Package className='w-3.5 h-3.5' />Quantity</div>
									<p className='font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{listing.quantityKg} kg</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
									<div className='flex items-center gap-1.5 text-[var(--color-inspector-text-muted)] text-xs'><Building2 className='w-3.5 h-3.5' />Source Rating</div>
									<p className='font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{listing.sourceRating ?? 'N/A'}</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] p-2.5'>
									<div className='flex items-center gap-1.5 text-[var(--color-inspector-text-muted)] text-xs'><MapPin className='w-3.5 h-3.5' />Region</div>
									<p className='font-semibold text-[var(--color-inspector-text-primary)] mt-1'>{listing.region}</p>
								</div>
							</div>

							<div className='space-y-1'>
								<p className='text-xs font-semibold text-[var(--color-inspector-text-muted)] uppercase tracking-wide'>Risk Flags</p>
								<div className='flex flex-wrap gap-1.5'>
									{listing.riskFlags.length === 0 ? (
										<Badge className='border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] text-[10px] hover:bg-[var(--color-inspector-surface-elevated)]'>
											No active flags
										</Badge>
									) : (
										listing.riskFlags.map((flag) => (
											<Badge key={flag} className='border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] text-[10px] hover:bg-[var(--color-inspector-surface-elevated)]'>
												{flag.replace(/_/g, ' ')}
											</Badge>
										))
									)}
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4 space-y-3'>
							<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Safety Declaration</h3>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-2.5 bg-[var(--color-inspector-surface-elevated)]'>
									<div className='flex items-center gap-1 text-[var(--color-inspector-text-muted)]'><Utensils className='w-3.5 h-3.5' />Storage Type</div>
									<p className='mt-1 font-semibold text-[var(--color-inspector-text-primary)]'>{listing.safetyDeclaration.storageType.replace('_', ' ')}</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-2.5 bg-[var(--color-inspector-surface-elevated)]'>
									<div className='flex items-center gap-1 text-[var(--color-inspector-text-muted)]'><Package className='w-3.5 h-3.5' />Packaging</div>
									<p className='mt-1 font-semibold text-[var(--color-inspector-text-primary)]'>{listing.safetyDeclaration.packagingCondition.replace('_', ' ')}</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-2.5 bg-[var(--color-inspector-surface-elevated)]'>
									<div className='flex items-center gap-1 text-[var(--color-inspector-text-muted)]'><Clock3 className='w-3.5 h-3.5' />Prepared At</div>
									<p className='mt-1 font-semibold text-[var(--color-inspector-text-primary)]'>{formatDateTimeIST(new Date(listing.safetyDeclaration.preparationTime))}</p>
								</div>
								<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-2.5 bg-[var(--color-inspector-surface-elevated)]'>
									<div className='flex items-center gap-1 text-[var(--color-inspector-text-muted)]'><Thermometer className='w-3.5 h-3.5' />Temp Requirement</div>
									<p className='mt-1 font-semibold text-[var(--color-inspector-text-primary)]'>{listing.safetyDeclaration.temperatureRequiredC ? `${listing.safetyDeclaration.temperatureRequiredC}C` : 'Not specified'}</p>
								</div>
							</div>

							<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-3 bg-[var(--color-inspector-surface-elevated)]'>
								<p className='text-xs font-semibold text-[var(--color-inspector-text-muted)]'>Handling Declaration</p>
								<p className='text-sm text-[var(--color-inspector-text-secondary)] mt-1'>{listing.safetyDeclaration.handlingDeclaration}</p>
							</div>

							<div className='rounded-[var(--radius-md)] border border-[var(--color-inspector-border-subtle)] p-3 bg-[var(--color-inspector-surface-elevated)]'>
								<p className='text-xs font-semibold text-[var(--color-inspector-text-muted)]'>Hygiene Declaration</p>
								<p className='text-sm text-[var(--color-inspector-text-secondary)] mt-1'>{listing.safetyDeclaration.hygieneDeclaration}</p>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className='space-y-4'>
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4 space-y-3'>
							<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Inspector Action</h3>
							<Textarea
								value={note}
								onChange={(event) => setNote(event.target.value)}
								placeholder='Add verification notes, rationale, and required corrective action...'
								className='min-h-[120px] bg-[var(--color-inspector-surface-elevated)] border-[var(--color-inspector-border-subtle)]'
							/>

							<div className='space-y-2'>
								<Button onClick={handleApprove} className='w-full bg-[var(--color-inspector-risk-low)] hover:bg-[var(--color-inspector-risk-low)]/90 text-white'>
									<CircleCheckBig className='w-4 h-4 mr-2' /> Approve Listing
								</Button>
								<Button onClick={handleFlag} variant='outline' className='w-full border-[var(--color-inspector-risk-high)] text-[var(--color-inspector-risk-high)] hover:bg-[var(--color-inspector-risk-high-light)]'>
									<ShieldAlert className='w-4 h-4 mr-2' /> Flag for Review
								</Button>
								<Button onClick={handleRequestInfo} variant='outline' className='w-full border-[var(--color-inspector-info)] text-[var(--color-inspector-info)] hover:bg-[var(--color-inspector-info-light)]'>
									<Info className='w-4 h-4 mr-2' /> Request More Info
								</Button>
								<Button onClick={handleDisable} variant='outline' className='w-full border-[var(--color-inspector-risk-critical)] text-[var(--color-inspector-risk-critical)] hover:bg-[var(--color-inspector-risk-critical-light)]'>
									<Ban className='w-4 h-4 mr-2' /> Temporarily Disable Listing
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-4'>
							<h4 className='text-sm font-semibold text-[var(--color-inspector-text-primary)] mb-2'>Enforcement Rules</h4>
							<ul className='space-y-1.5 text-xs text-[var(--color-inspector-text-muted)]'>
								<li>Food must have valid preparation and expiry time.</li>
								<li>Consumer food must stay within a 24-hour expiry window.</li>
								<li>Storage conditions must be declared for every listing.</li>
								<li>Unsafe or expired food should be removed immediately.</li>
							</ul>
							<div className='mt-3 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)] text-xs flex items-start gap-2'>
								<MessageCircleWarning className='w-4 h-4 mt-0.5' />
								<span>All enforcement actions are audit logged for transparency.</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</motion.div>
		</div>
	)
}
