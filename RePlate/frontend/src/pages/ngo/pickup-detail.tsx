import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	ArrowLeft,
	MapPin,
	Clock,
	Weight,
	Building2,
	Phone,
	Navigation,
	CheckCircle2,
	QrCode,
	AlertTriangle,
	Info,
	HeartHandshake,
	Camera,
	X,
	XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNGOStore } from '@/stores/ngo-store'
import { useNGOUIStore } from '@/stores/ngo-ui-store'
import { cn } from '@/lib/utils'

export function NGOPickupDetailPage() {
	const { pickupId } = useParams()
	const navigate = useNavigate()
	const { pickups, history, completePickup, cancelPickup } = useNGOStore()

	// Find in active pickups or completed history
	const pickup = pickups.find((p) => p.id === pickupId) || history.find((p) => p.id === pickupId)

	const [showScanner, setShowScanner] = useState(false)
	const [scannedCode, setScannedCode] = useState('')
	const [verifyError, setVerifyError] = useState('')
	
	// Completion Flow State
	const [showCompleteFlow, setShowCompleteFlow] = useState(false)
	const [mealsServed, setMealsServed] = useState(pickup?.donation.servings.toString() || '0')
	const [targetCommunity, setTargetCommunity] = useState('')
	const [redistributionNotes, setRedistributionNotes] = useState('')

	if (!pickup) {
		return (
			<div className='flex flex-col items-center justify-center h-full text-center px-4 space-y-4'>
				<AlertTriangle size={48} className='text-[var(--color-ngo-text-muted)]' />
				<h2 className='text-xl font-bold font-[var(--font-display)]'>Pickup Not Found</h2>
				<p className='text-[var(--color-ngo-text-secondary)]'>This pickup may have been cancelled or doesn't exist.</p>
				<Button variant='outline' onClick={() => navigate('/ngo/pickups')}>Back to Queue</Button>
			</div>
		)
	}

	const isCompleted = pickup.status === 'completed'
	const isUrgent = !isCompleted && (pickup.priority === 'urgent' || pickup.donation.urgency === 'critical')

	const handleVerify = () => {
		if (scannedCode.toUpperCase() === pickup.verificationCode) {
			setVerifyError('')
			setShowScanner(false)
			setShowCompleteFlow(true)
		} else {
			setVerifyError('Invalid code. Please check with the donor.')
		}
	}

	const handleComplete = () => {
		completePickup(pickup.id, parseInt(mealsServed) || pickup.donation.servings, targetCommunity, redistributionNotes)
		setShowCompleteFlow(false)
		navigate('/ngo/pickups', { replace: true })
	}

	const handleCancel = () => {
		if (window.confirm('Are you sure you want to cancel this pickup? This will return the donation to the available pool.')) {
			cancelPickup(pickup.id)
			navigate('/ngo/pickups', { replace: true })
		}
	}

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-surface)]'>
			{/* ── Header ── */}
			<div className={cn(
				'flex-shrink-0 flex items-center gap-3 pt-3 pb-4 px-4 transition-colors',
				isCompleted ? 'bg-[var(--color-success)] text-white' : isUrgent ? 'bg-[var(--color-error)] text-white' : 'bg-white text-[var(--color-ngo-text-primary)] border-b border-[var(--color-ngo-border)]'
			)}>
				<button onClick={() => navigate(-1)} className='p-2 -ml-2 rounded-full hover:bg-black/10 transition-colors flex-shrink-0'>
					<ArrowLeft size={20} />
				</button>
				<div className='flex-1 min-w-0'>
					<p className='text-xs font-semibold opacity-80 mb-0.5 uppercase tracking-wider'>
						{isCompleted ? 'Completed Pickup' : 'Pickup Details'}
					</p>
					<h1 className='text-xl font-bold font-[var(--font-display)] truncate'>
						{pickup.donation.donorName}
					</h1>
				</div>
				{!isCompleted && (
					<Badge className={cn('bg-white/20 text-current hover:bg-white/30 border-none px-2.5 shadow-none flex-shrink-0')}>
						{isUrgent ? 'CRITICAL' : 'SCHEDULED'}
					</Badge>
				)}
			</div>

			<div className='flex-1 overflow-y-auto min-h-0'>
				<div className='max-w-3xl mx-auto'>
					{/* Status Banner */}
					{isCompleted && (
						<div className='bg-[var(--color-success-light)] border-b border-[var(--color-success)]/20 p-4 flex items-center justify-center gap-2'>
							<CheckCircle2 size={20} className='text-[var(--color-success)]' />
							<span className='font-semibold text-[var(--color-success)]'>Successfully picked up at {new Date(pickup.actualPickupTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
						</div>
					)}
					{isUrgent && !isCompleted && (
						<div className='bg-[var(--color-error-light)] border-b border-[var(--color-error)]/20 p-4 flex items-start gap-3'>
							<AlertTriangle size={20} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
							<div>
								<h3 className='font-bold text-[var(--color-error)]'>Urgent Pickup Required</h3>
								<p className='text-sm text-[var(--color-error)]/80 font-medium'>Must collect before {new Date(pickup.donation.pickupEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to avoid spoilage.</p>
							</div>
						</div>
					)}

					<div className='p-4 md:p-6 space-y-6'>
						{/* Food Info Card */}
						<div className='rounded-[var(--radius-xl)] bg-[var(--color-ngo-bg)] border border-[var(--color-ngo-border)] overflow-hidden flex flex-col sm:flex-row'>
							<div className='w-full sm:w-1/3 h-48 sm:h-auto'>
								<img src={pickup.donation.images[0]} alt={pickup.donation.foodName} className='w-full h-full object-cover' />
							</div>
							<div className='p-5 flex-1 flex flex-col justify-between'>
								<div>
									<h2 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)] mb-1'>
										{pickup.donation.foodName}
									</h2>
									<p className='text-sm text-[var(--color-ngo-text-secondary)] line-clamp-2 mb-4'>
										{pickup.donation.description}
									</p>
								</div>
								
								<div className='grid grid-cols-2 gap-3'>
									<div className='bg-white p-3 rounded-[var(--radius-md)] border border-[var(--color-ngo-border-subtle)]'>
										<div className='flex items-center gap-1.5 text-[var(--color-ngo-text-muted)] mb-1'>
											<Weight size={14} />
											<span className='text-xs font-semibold'>Quantity</span>
										</div>
										<p className='font-bold text-[var(--color-ngo-text-primary)]'>{pickup.donation.quantityKg} kg</p>
									</div>
									<div className='bg-white p-3 rounded-[var(--radius-md)] border border-[var(--color-ngo-border-subtle)]'>
										<div className='flex items-center gap-1.5 text-[var(--color-ngo-text-muted)] mb-1'>
											<Clock size={14} />
											<span className='text-xs font-semibold'>Expires</span>
										</div>
										<p className={cn('font-bold', isUrgent ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-text-primary)]')}>
											{new Date(pickup.donation.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Verification Code Display (Before Completion) */}
						{!isCompleted && !showCompleteFlow && (
							<div className='p-5 rounded-[var(--radius-xl)] bg-[var(--color-ngo-surface-elevated)] border-2 border-dashed border-[var(--color-ngo-accent)] flex items-center justify-between'>
								<div>
									<p className='text-xs font-bold tracking-wider text-[var(--color-ngo-text-muted)] uppercase mb-1'>Verification Code</p>
									<p className='text-3xl font-mono font-bold tracking-widest text-[var(--color-ngo-accent)]'>{pickup.verificationCode}</p>
								</div>
								<div className='w-16 h-16 bg-white rounded-[var(--radius-md)] border border-[var(--color-ngo-border)] flex items-center justify-center p-2'>
									<QrCode size={40} className='text-[var(--color-ngo-text-primary)]' />
								</div>
							</div>
						)}

						{/* Logistics Section */}
						<div className='space-y-4'>
							<h3 className='font-bold text-lg font-[var(--font-display)] text-[var(--color-ngo-text-primary)] flex items-center gap-2'>
								<Building2 size={20} className='text-[var(--color-ngo-accent)]' /> Location & Handling
							</h3>
							
							<div className='p-4 rounded-[var(--radius-xl)] bg-white border border-[var(--color-ngo-border)] space-y-4'>
								<div className='flex items-start justify-between gap-4'>
									<div className='flex items-start gap-3'>
										<MapPin className='text-[var(--color-ngo-text-muted)] mt-0.5 flex-shrink-0' size={18} />
										<div>
											<p className='font-semibold text-[var(--color-ngo-text-primary)]'>{pickup.donation.donorName}</p>
											<p className='text-sm text-[var(--color-ngo-text-secondary)] mt-0.5'>{pickup.donation.donorAddress}</p>
										</div>
									</div>
									{!isCompleted && (
										<Button size='icon' variant='outline' className='flex-shrink-0 rounded-full border-[var(--color-ngo-border)] text-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)]' onClick={() => window.open(`https://maps.google.com/?q=${pickup.donation.donorLocation.lat},${pickup.donation.donorLocation.lng}`)}>
											<Navigation size={18} />
										</Button>
									)}
								</div>

								<div className='h-px bg-[var(--color-ngo-border-subtle)] w-full' />

								<div className='flex items-start justify-between gap-4'>
									<div className='flex items-start gap-3'>
										<Phone className='text-[var(--color-ngo-text-muted)] mt-0.5 flex-shrink-0' size={18} />
										<div>
											<p className='font-semibold text-[var(--color-ngo-text-primary)]'>Contact Donor</p>
											<p className='text-sm text-[var(--color-ngo-text-secondary)] mt-0.5'>{pickup.donation.donorPhone || 'No phone provided'}</p>
										</div>
									</div>
									{!isCompleted && pickup.donation.donorPhone && (
										<Button size='icon' variant='outline' className='flex-shrink-0 rounded-full border-[var(--color-ngo-border)] text-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)]' onClick={() => window.open(`tel:${pickup.donation.donorPhone}`)}>
											<Phone size={18} />
										</Button>
									)}
								</div>

								<div className='h-px bg-[var(--color-ngo-border-subtle)] w-full' />

								<div className='flex items-start gap-3'>
									<Info className='text-[var(--color-ngo-text-muted)] mt-0.5 flex-shrink-0' size={18} />
									<div className='space-y-2'>
										<p className='text-sm text-[var(--color-ngo-text-secondary)]'>
											<strong className='font-semibold text-[var(--color-ngo-text-primary)]'>Packaging:</strong> {pickup.donation.packagingCondition.replace('_', ' ')}
										</p>
										<p className='text-sm text-[var(--color-ngo-text-secondary)]'>
											<strong className='font-semibold text-[var(--color-ngo-text-primary)]'>Storage required:</strong> {pickup.donation.storageType.replace('_', ' ')}
										</p>
										{pickup.donation.notes && (
											<p className='text-sm text-[var(--color-ngo-text-secondary)] italic mt-2 p-2 bg-[var(--color-ngo-bg)] rounded border border-[var(--color-ngo-border-subtle)]'>
												"{pickup.donation.notes}"
											</p>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Completed details (if finished) */}
						{isCompleted && (
							<div className='space-y-4 pt-4'>
								<h3 className='font-bold text-lg font-[var(--font-display)] text-[var(--color-success)] flex items-center gap-2'>
									<HeartHandshake size={20} /> Distribution Report
								</h3>
								<div className='p-4 rounded-[var(--radius-xl)] bg-[var(--color-success-light)] border border-[var(--color-success)]/20 space-y-3'>
									<div>
										<p className='text-xs font-semibold text-[var(--color-success)]/80 uppercase mb-1'>Target Community</p>
										<p className='text-sm font-medium text-[var(--color-ngo-text-primary)]'>{pickup.redistributionTarget || 'Not specified'}</p>
									</div>
									<div className='grid grid-cols-2 gap-3 pt-3 border-t border-[var(--color-success)]/20'>
										<div>
											<p className='text-xs font-semibold text-[var(--color-success)]/80 uppercase mb-1'>Meals Served</p>
											<p className='text-lg font-bold text-[var(--color-success)]'>{pickup.mealsServed}</p>
										</div>
										<div>
											<p className='text-xs font-semibold text-[var(--color-success)]/80 uppercase mb-1'>CO₂ Prevented</p>
											<p className='text-lg font-bold text-[var(--color-success)]'>{pickup.donation.co2SavedKg} kg</p>
										</div>
									</div>
									{pickup.redistributionNotes && (
										<div className='pt-3 border-t border-[var(--color-success)]/20'>
											<p className='text-xs font-semibold text-[var(--color-success)]/80 uppercase mb-1'>Notes</p>
											<p className='text-sm text-[var(--color-ngo-text-secondary)] italic'>"{pickup.redistributionNotes}"</p>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
					
				{/* Bottom Padding */}
				<div className='h-6' />
			</div>
			</div>

			{/* ── Sticky Action Bar (Active only) — proper flex footer, never overlaps ── */}
			{!isCompleted && !showCompleteFlow && (
				<div className='flex-shrink-0 p-4 bg-white border-t border-[var(--color-ngo-border)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]'>
					<div className='max-w-3xl mx-auto flex gap-3'>
						<Button variant='outline' className='flex-1 h-12 border-[var(--color-ngo-border)] text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl' onClick={handleCancel}>
							<XCircle className='mr-2 h-4 w-4' /> Cancel
						</Button>
						<Button className='flex-[2] bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white h-12 text-base font-bold rounded-xl' onClick={() => setShowScanner(true)}>
							<Camera className='mr-2 h-5 w-5' /> Verify & Collect
						</Button>
					</div>
				</div>
			)}

			{/* ── QR / Code Scanner Modal ── */}
			<AnimatePresence>
				{showScanner && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className='fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4'
						>
							<div className='w-full max-w-sm bg-white rounded-[var(--radius-2xl)] overflow-hidden shadow-2xl'>
								<div className='bg-[var(--color-ngo-surface)] p-4 border-b border-[var(--color-ngo-border)] flex items-center justify-between'>
									<h3 className='font-bold text-[var(--color-ngo-text-primary)]'>Verify Pickup</h3>
									<button onClick={() => setShowScanner(false)} className='p-1 bg-black/5 rounded-full hover:bg-black/10'>
										<X size={20} />
									</button>
								</div>
								
								<div className='p-6 flex flex-col items-center justify-center space-y-6'>
									{/* Fake Camera View */}
									<div className='w-full aspect-square bg-black rounded-[var(--radius-xl)] relative overflow-hidden flex items-center justify-center border-4 border-black group'>
										<div className='absolute inset-12 border-2 border-[var(--color-ngo-accent)]/50 rounded-lg group-hover:border-[var(--color-ngo-accent)] transition-colors' />
										<div className='absolute top-0 left-0 w-full h-1 bg-green-400/50 shadow-[0_0_20px_5px_rgba(74,222,128,0.5)] animate-[scan_2s_ease-in-out_infinite]' />
										<Camera className='w-12 h-12 text-white/30' />
										<p className='absolute bottom-4 text-white/50 text-xs font-medium'>Scanning QR...</p>
									</div>

									<div className='flex items-center gap-4 w-full'>
										<div className='h-px bg-[var(--color-ngo-border)] flex-1' />
										<span className='text-xs font-bold text-[var(--color-ngo-text-muted)] uppercase'>OR ENTER CODE</span>
										<div className='h-px bg-[var(--color-ngo-border)] flex-1' />
									</div>

									<div className='w-full space-y-3'>
										<Input
											value={scannedCode}
											onChange={(e) => setScannedCode(e.target.value.toUpperCase())}
											placeholder='e.g. AAH-7821'
											className='text-center text-xl font-mono tracking-widest h-14 uppercase font-bold'
											maxLength={8}
										/>
										{verifyError && <p className='text-xs text-[var(--color-error)] text-center font-medium'>{verifyError}</p>}
										<Button 
											className='w-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white h-12 font-bold'
											onClick={handleVerify}
											disabled={scannedCode.length < 5}
										>
											Verify Code
										</Button>
									</div>
								</div>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* ── Post-Pickup Distribution Details Flow ── */}
			<AnimatePresence>
				{showCompleteFlow && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex flex-col justify-end lg:justify-center items-center p-0 lg:p-6'
					>
						<motion.div
							initial={{ y: '100%' }}
							animate={{ y: 0 }}
							exit={{ y: '100%' }}
							transition={{ type: 'spring', damping: 25, stiffness: 200 }}
							className='w-full lg:max-w-lg bg-white lg:rounded-[2rem] rounded-t-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]'
						>
							{/* Green Header */}
							<div className='bg-[var(--color-success)] p-6 text-white text-center flex-shrink-0'>
								<div className='w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm'>
									<CheckCircle2 size={32} className='text-white' />
								</div>
								<h2 className='text-2xl font-bold font-[var(--font-display)]'>Pickup Verified!</h2>
								<p className='text-white/90 text-sm mt-1'>You have successfully collected {pickup.donation.quantityKg} kg of food.</p>
							</div>

							{/* Form */}
							<div className='p-6 overflow-y-auto'>
								<div className='space-y-6'>
									<div className='text-center'>
										<h3 className='font-bold text-[var(--color-ngo-text-primary)] text-lg'>Distribution Plan</h3>
										<p className='text-xs text-[var(--color-ngo-text-muted)] mt-1'>Log where this food will be served for impact tracking.</p>
									</div>

									<div className='space-y-4'>
										<div className='space-y-1.5'>
											<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Target Community / Location</label>
											<Input 
												placeholder='e.g., Dharavi Shelter Home' 
												value={targetCommunity}
												onChange={(e) => setTargetCommunity(e.target.value)}
												className='h-11 bg-white'
											/>
										</div>

										<div className='space-y-1.5'>
											<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)] flex justify-between'>
												<span>Estimated Meals to Serve</span>
												<span className='text-[var(--color-ngo-text-muted)] font-normal'>Based on quantity: ~{pickup.donation.servings}</span>
											</label>
											<Input 
												type='number'
												value={mealsServed}
												onChange={(e) => setMealsServed(e.target.value)}
												className='h-11 bg-white font-bold'
											/>
										</div>

										<div className='space-y-1.5'>
											<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Distribution Notes (Optional)</label>
											<Textarea 
												placeholder='Add any details about the recipients or condition of food...' 
												value={redistributionNotes}
												onChange={(e) => setRedistributionNotes(e.target.value)}
												className='bg-white min-h-[100px] resize-none'
											/>
										</div>
									</div>
								</div>

								<div className='pt-6 mt-6 border-t border-[var(--color-ngo-border-subtle)] space-y-3'>
									<Button 
										className='w-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white h-12 text-base font-bold rounded-xl shadow-lg shadow-[var(--color-ngo-accent)]/20'
										onClick={handleComplete}
									>
										Complete & Save Impact
									</Button>
									<Button 
										variant='ghost' 
										className='w-full text-[var(--color-ngo-text-muted)] hover:bg-black/5 h-12 rounded-xl'
										onClick={() => {
											completePickup(pickup.id, parseInt(mealsServed) || pickup.donation.servings, 'Unspecified', '')
											setShowCompleteFlow(false)
											navigate('/ngo/pickups', { replace: true })
										}}
									>
										Skip for now (Save defaults)
									</Button>
								</div>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			<style>{`
				@keyframes scan {
					0%, 100% { transform: translateY(0); opacity: 0; }
					10%, 90% { opacity: 1; }
					50% { transform: translateY(200px); }
				}
			`}</style>
		</div>
	)
}