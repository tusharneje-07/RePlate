import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	Search,
	MapPin,
	Clock,
	Weight,
	Building2,
	ChevronRight,
	AlertCircle,
	CheckCircle2,
	QrCode,
	Phone,
	Navigation,
	ClipboardList,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useNGOStore } from '@/stores/ngo-store'
import type { NGOPickup } from '@/types'

// ── Components ────────────────────────────────────────────────

function StatusBadge({ status, priority }: { status: string, priority?: string }) {
	if (status === 'completed') {
		return <Badge className='bg-[var(--color-success-light)] text-[var(--color-success)] text-[9px] font-bold tracking-wide rounded hover:bg-[var(--color-success-light)]'>COMPLETED</Badge>
	}
	if (priority === 'urgent' || priority === 'high') {
		return <Badge className='bg-[var(--color-error)] text-white text-[9px] font-bold tracking-wide rounded hover:bg-[var(--color-error)] animate-pulse'>URGENT</Badge>
	}
	return <Badge className='bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)] text-[9px] font-bold tracking-wide rounded hover:bg-[var(--color-ngo-accent-light)] border border-[var(--color-ngo-accent)]/20'>SCHEDULED</Badge>
}

// ── Main Pickups Page ─────────────────────────────────────────
export function NGOPickupsPage() {
	const navigate = useNavigate()
	const { pickups, history } = useNGOStore()
	const [searchQuery, setSearchQuery] = useState('')
	const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

	// Active pickups come from `pickups`, completed from `history`
	const sourceList = activeTab === 'completed' ? history : pickups

	// Filter
	const filtered = sourceList.filter((p) => {
		const matchesSearch =
			p.donation.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.donation.foodName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			p.id.toLowerCase().includes(searchQuery.toLowerCase())
		return matchesSearch
	})

	// Sort active by expiry urgency
	const sorted = [...filtered].sort((a, b) => {
		if (activeTab === 'completed') {
			return new Date(b.actualPickupTime || b.scheduledAt).getTime() - new Date(a.actualPickupTime || a.scheduledAt).getTime()
		}
		
		const urgA = a.priority === 'urgent' || a.donation.urgency === 'critical' ? 1 : 0
		const urgB = b.priority === 'urgent' || b.donation.urgency === 'critical' ? 1 : 0
		if (urgA !== urgB) return urgB - urgA
		return new Date(a.donation.expiresAt).getTime() - new Date(b.donation.expiresAt).getTime()
	})

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Header ── */}
			<div className='sticky top-0 z-20 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] px-4 py-3 space-y-3'>
				<div className='flex items-center justify-between'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
						Pickup Queue
					</h1>
					{activeTab === 'active' && sorted.length > 0 && (
						<Button
							variant='outline'
							size='sm'
							className='h-8 text-xs bg-white text-[var(--color-ngo-text-secondary)] border-[var(--color-ngo-border)] rounded-full'
							onClick={() => navigate('/ngo/discover')}
						>
							Find More
						</Button>
					)}
				</div>

				<div className='relative'>
					<Search className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ngo-text-muted)] w-4 h-4' />
					<Input
						placeholder='Search by donor, food, or ID...'
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className='pl-9 bg-[var(--color-ngo-surface-elevated)] border-transparent focus-visible:ring-[var(--color-ngo-accent)] h-10 rounded-full text-sm'
					/>
				</div>

				{/* Tabs */}
				<div className='flex p-1 bg-[var(--color-ngo-surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-ngo-border)]'>
					<button
						onClick={() => setActiveTab('active')}
						className={cn(
							'flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-all',
							activeTab === 'active'
								? 'bg-white text-[var(--color-ngo-accent)] shadow-sm'
								: 'text-[var(--color-ngo-text-muted)] hover:text-[var(--color-ngo-text-secondary)]',
						)}
					>
						Active Pickups
					</button>
					<button
						onClick={() => setActiveTab('completed')}
						className={cn(
							'flex-1 py-1.5 text-xs font-semibold rounded-[var(--radius-md)] transition-all',
							activeTab === 'completed'
								? 'bg-white text-[var(--color-ngo-accent)] shadow-sm'
								: 'text-[var(--color-ngo-text-muted)] hover:text-[var(--color-ngo-text-secondary)]',
						)}
					>
						Completed
					</button>
				</div>
			</div>

			{/* ── List ── */}
			<div className='flex-1 overflow-y-auto p-4 md:px-6 max-w-3xl mx-auto w-full'>
				{sorted.length === 0 ? (
					<div className='h-[40vh] flex flex-col items-center justify-center text-center px-4'>
					<div className='w-16 h-16 rounded-full bg-[var(--color-ngo-surface-elevated)] flex items-center justify-center mb-3'>
						<ClipboardList size={28} className='text-[var(--color-ngo-text-muted)]' />
					</div>
						<p className='text-[var(--color-ngo-text-primary)] font-bold text-lg font-[var(--font-display)] mb-1'>
							{activeTab === 'active' ? 'Queue is clear!' : 'No completed pickups yet'}
						</p>
						<p className='text-[var(--color-ngo-text-muted)] text-sm max-w-xs'>
							{activeTab === 'active'
								? "You don't have any pending pickups. Check the discover tab to find available donations."
								: "Completed pickups will appear here."}
						</p>
						{activeTab === 'active' && (
							<Button
								className='mt-5 bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white font-bold rounded-full px-6'
								onClick={() => navigate('/ngo/discover')}
							>
								Discover Donations
							</Button>
						)}
					</div>
				) : (
					<motion.div
						variants={staggerContainer}
						initial='hidden'
						animate='visible'
						className='space-y-3 pb-20'
					>
						{sorted.map((pickup) => {
							const isUrgent = activeTab === 'active' && (pickup.priority === 'urgent' || pickup.donation.urgency === 'critical')

							return (
								<motion.div variants={slideUp} key={pickup.id}>
									<Link to={`/ngo/pickups/${pickup.id}`}>
										<div
											className={cn(
												'rounded-[var(--radius-xl)] border p-4 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group',
												isUrgent
													? 'bg-[var(--color-error-light)]/40 border-[var(--color-error)]/30'
													: 'bg-white border-[var(--color-ngo-border)]'
											)}
										>
											{/* Status strip */}
											<div className={cn(
												'absolute left-0 top-0 bottom-0 w-1.5 transition-colors',
												activeTab === 'completed' ? 'bg-[var(--color-success)]' : isUrgent ? 'bg-[var(--color-error)]' : 'bg-[var(--color-ngo-accent)] group-hover:bg-[var(--color-ngo-accent-hover)]'
											)} />

											<div className='flex justify-between items-start mb-3'>
												<div className='flex items-center gap-2.5'>
													<div className='w-10 h-10 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 bg-[var(--color-ngo-surface-elevated)] border border-[var(--color-ngo-border-subtle)]'>
														<img src={pickup.donation.images[0]} alt={pickup.donation.donorName} className='w-full h-full object-cover' />
													</div>
													<div className='min-w-0'>
														<p className='text-sm font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)] truncate'>
															{pickup.donation.donorName}
														</p>
														<div className='flex items-center gap-2 mt-0.5 text-xs text-[var(--color-ngo-text-muted)]'>
															<span className='font-medium text-[var(--color-ngo-text-secondary)]'>{pickup.donation.foodName}</span>
															<span>·</span>
															<span>{pickup.donation.quantityKg} kg</span>
														</div>
													</div>
												</div>
												<div className='flex-shrink-0'>
													<StatusBadge status={pickup.status} priority={pickup.priority} />
												</div>
											</div>

											<div className='bg-[var(--color-ngo-bg)] rounded-[var(--radius-md)] p-2.5 space-y-2 border border-[var(--color-ngo-border-subtle)]'>
												<div className='flex items-start gap-2 text-xs'>
													<MapPin size={14} className={cn('flex-shrink-0 mt-0.5', isUrgent ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-accent)]')} />
													<span className='text-[var(--color-ngo-text-secondary)] line-clamp-1'>
														{pickup.donation.donorAddress}
													</span>
												</div>
												
												{activeTab === 'active' ? (
													<div className='flex justify-between items-center text-xs'>
														<div className='flex items-center gap-2'>
															<Clock size={14} className={isUrgent ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-text-muted)]'} />
															<span className={isUrgent ? 'text-[var(--color-error)] font-bold' : 'text-[var(--color-ngo-text-secondary)]'}>
																Due by {new Date(pickup.donation.pickupEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
															</span>
														</div>
														<div className='flex items-center gap-1 text-[var(--color-ngo-accent)] font-semibold bg-[var(--color-ngo-accent-light)] px-2 py-0.5 rounded'>
															<QrCode size={12} /> Scan QR
														</div>
													</div>
												) : (
													<div className='flex justify-between items-center text-xs'>
														<div className='flex items-center gap-2'>
															<CheckCircle2 size={14} className='text-[var(--color-success)]' />
															<span className='text-[var(--color-ngo-text-secondary)]'>
																Picked up at {new Date(pickup.actualPickupTime || pickup.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
															</span>
														</div>
														<span className='font-semibold text-[var(--color-success)]'>+{pickup.donation.quantityKg}kg rescued</span>
													</div>
												)}
											</div>
										</div>
									</Link>
								</motion.div>
							)
						})}
					</motion.div>
				)}
			</div>
		</div>
	)
}