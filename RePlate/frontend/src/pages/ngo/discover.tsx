import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	Search,
	SlidersHorizontal,
	MapPin,
	Clock,
	Weight,
	Building2,
	ChevronRight,
	Leaf,
	AlertCircle,
	X,
	Utensils,
	ShoppingBag,
	CheckCircle2,
	Info,
	HeartHandshake,
	Truck,
	Sparkles,
	RefreshCw,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { staggerContainer, slideUp, scaleIn } from '@/lib/motion'
import { formatRelativeTime, formatTimeIST, cn } from '@/lib/utils'
import { useNGOStore } from '@/stores/ngo-store'
import type { Donation } from '@/types'
import { NGOMatchPanel } from '@/components/ai/NGOMatchPanel'

// ── Components ────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: Donation['urgency'] }) {
	const config = {
		critical: { label: 'CRITICAL', className: 'bg-[var(--color-error)] text-white animate-pulse' },
		high: { label: 'HIGH URGENCY', className: 'bg-[var(--color-warning)] text-white' },
		medium: { label: 'Medium', className: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]' },
		low: { label: 'Low', className: 'bg-[var(--color-ngo-surface-elevated)] text-[var(--color-ngo-text-muted)]' },
	}

	const c = config[urgency]
	return <Badge className={cn('text-[9px] font-bold tracking-wide px-1.5 py-0 rounded', c.className)}>{c.label}</Badge>
}

// ── Main Discover Page ────────────────────────────────────────
export function NGODiscoverPage() {
	const { donations, profile, claimDonation, refreshDonations } = useNGOStore()

	const [searchQuery, setSearchQuery] = useState('')
	const [activeCategory, setActiveCategory] = useState<string>('all')
	const [showFilters, setShowFilters] = useState(false)
	const [aiMatchOpen, setAiMatchOpen] = useState(false)

	// Auto-refresh donations every time this page is visited
	useEffect(() => {
		refreshDonations()
	}, [refreshDonations])

	// Filter state
	const [maxDistance, setMaxDistance] = useState<number>(50) // km
	const [urgencyFilter, setUrgencyFilter] = useState<string[]>([])
	const [minQuantity, setMinQuantity] = useState<number>(0)

	const [refreshing, setRefreshing] = useState(false)

	// Selected donation for claim flow
	const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null)
	const [claimStep, setClaimStep] = useState<1 | 2 | 3>(1) // 1: detail, 2: confirm, 3: success

	// Filter data
	const availableDonations = donations.filter((d) => d.status === 'available')

	const categories = ['all', ...Array.from(new Set(availableDonations.map((d) => d.category)))]

	const filteredDonations = availableDonations.filter((d) => {
		if (searchQuery && !d.foodName.toLowerCase().includes(searchQuery.toLowerCase()) && !d.donorName.toLowerCase().includes(searchQuery.toLowerCase())) return false
		if (activeCategory !== 'all' && d.category !== activeCategory) return false
		if (d.distance && d.distance / 1000 > maxDistance) return false
		if (urgencyFilter.length > 0 && !urgencyFilter.includes(d.urgency)) return false
		if (d.quantityKg < minQuantity) return false
		return true
	})

	// Sort by urgency then distance
	const sortedDonations = [...filteredDonations].sort((a, b) => {
		const urgWeight = { critical: 4, high: 3, medium: 2, low: 1 }
		const urgDiff = urgWeight[b.urgency] - urgWeight[a.urgency]
		if (urgDiff !== 0) return urgDiff
		return (a.distance || 0) - (b.distance || 0)
	})

	const handleClaim = () => {
		if (!selectedDonation) return
		claimDonation(selectedDonation.id)
		setClaimStep(3)
	}

	const closeSheet = () => {
		setSelectedDonation(null)
		setTimeout(() => setClaimStep(1), 300)
	}

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Header & Search ── */}
			<div className='sticky top-0 z-20 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] px-4 py-3 space-y-3'>
				<div className='flex items-center gap-2'>
					<div className='relative flex-1'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ngo-text-muted)] w-4 h-4' />
						<Input
							placeholder='Search food or donors...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-9 bg-[var(--color-ngo-surface-elevated)] border-transparent focus-visible:ring-[var(--color-ngo-accent)] h-10 rounded-full text-sm'
						/>
					</div>
				<Button
					variant='outline'
					size='icon'
					onClick={() => setShowFilters(!showFilters)}
					className={cn(
						'h-10 w-10 rounded-full flex-shrink-0 transition-colors',
						showFilters
							? 'bg-[var(--color-ngo-accent)] text-white border-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] hover:text-white'
							: 'bg-white border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] hover:bg-[var(--color-ngo-surface-elevated)]',
					)}
				>
					<SlidersHorizontal className='w-4 h-4' />
					{(urgencyFilter.length > 0 || maxDistance < 50 || minQuantity > 0) && !showFilters && (
						<span className='absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[var(--color-ngo-accent)] border border-white' />
					)}
				</Button>
				<Button
					size='sm'
					onClick={() => setAiMatchOpen(true)}
					className='h-10 flex-shrink-0 rounded-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white gap-1.5 px-3 text-xs font-semibold'
				>
					<Sparkles className='w-3.5 h-3.5' />
					<span className='hidden sm:inline'>AI Match</span>
				</Button>
				<Button
					variant='outline'
					size='icon'
					disabled={refreshing}
					onClick={async () => {
						setRefreshing(true)
						await refreshDonations()
						setRefreshing(false)
					}}
					className='h-10 w-10 rounded-full flex-shrink-0 bg-white border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] hover:bg-[var(--color-ngo-surface-elevated)] disabled:opacity-50'
					title='Refresh listings'
				>
					<RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
				</Button>
				</div>

				{/* Categories */}
				<div className='flex overflow-x-auto no-scrollbar gap-2 pb-1'>
					{categories.map((cat) => (
						<button
							key={cat}
							onClick={() => setActiveCategory(cat)}
							className={cn(
								'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border',
								activeCategory === cat
									? 'bg-[var(--color-ngo-accent)] text-white border-[var(--color-ngo-accent)] shadow-sm'
									: 'bg-white text-[var(--color-ngo-text-secondary)] border-[var(--color-ngo-border)] hover:border-[var(--color-ngo-accent)]',
							)}
						>
							{cat === 'all' ? 'All Food' : cat.charAt(0).toUpperCase() + cat.slice(1)}
						</button>
					))}
				</div>
			</div>

			<div className='flex-1 overflow-hidden relative'>
				{/* ── Main Grid ── */}
				<div className='h-full overflow-y-auto p-4 md:px-6 max-w-7xl mx-auto'>
					{sortedDonations.length === 0 ? (
						<div className='h-[50vh] flex flex-col items-center justify-center text-center px-4'>
						<div className='w-16 h-16 rounded-full bg-[var(--color-ngo-surface-elevated)] flex items-center justify-center mb-3'>
							<Search size={28} className='text-[var(--color-ngo-text-muted)]' />
						</div>
							<p className='text-[var(--color-ngo-text-primary)] font-bold text-lg font-[var(--font-display)] mb-1'>
								No donations found
							</p>
							<p className='text-[var(--color-ngo-text-muted)] text-sm max-w-xs'>
								Try adjusting your filters or expanding your search radius to find available food.
							</p>
							{(urgencyFilter.length > 0 || maxDistance < 10 || minQuantity > 0 || activeCategory !== 'all' || searchQuery) && (
								<Button
									variant='outline'
							onClick={() => {
									setSearchQuery('')
									setActiveCategory('all')
									setUrgencyFilter([])
									setMaxDistance(50)
									setMinQuantity(0)
								}}
									className='mt-4 rounded-full border-[var(--color-ngo-border)]'
								>
									Clear all filters
								</Button>
							)}
						</div>
					) : (
						<motion.div
							variants={staggerContainer}
							initial='hidden'
							animate='visible'
							className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-20'
						>
							{sortedDonations.map((don) => (
								<motion.div variants={slideUp} key={don.id}>
									<Card
										className='overflow-hidden border-[var(--color-ngo-border)] bg-white hover:shadow-md transition-shadow cursor-pointer group flex flex-col h-full'
										onClick={() => {
											setSelectedDonation(don)
											setClaimStep(1)
										}}
									>
										{/* Image Banner */}
										<div className='relative h-36 overflow-hidden bg-[var(--color-ngo-surface-elevated)]'>
											<img
												src={don.images[0]}
												alt={don.foodName}
												className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-105'
											/>
											<div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent' />
											<div className='absolute top-3 left-3'>
												<UrgencyBadge urgency={don.urgency} />
											</div>
											<div className='absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-[var(--radius-sm)] text-xs font-bold text-[var(--color-ngo-text-primary)] flex items-center gap-1 shadow-sm'>
												<Weight size={12} className='text-[var(--color-ngo-accent)]' />
												{don.quantityKg} kg
											</div>
											<div className='absolute bottom-3 left-3 text-white'>
												<p className='font-bold text-sm truncate w-full pr-4'>{don.foodName}</p>
											</div>
										</div>

										<CardContent className='p-3 flex flex-col flex-1'>
											{/* Donor info */}
											<div className='flex items-center gap-2 mb-3'>
												<div className='w-6 h-6 rounded bg-[var(--color-ngo-surface-elevated)] flex items-center justify-center flex-shrink-0 text-xs'>
													{don.donorType === 'seller' ? <Building2 size={12} className='text-[var(--color-ngo-accent)]' /> : <HeartHandshake size={12} className='text-[var(--color-ngo-accent)]' />}
												</div>
												<div className='min-w-0 flex-1'>
													<p className='text-xs font-semibold text-[var(--color-ngo-text-primary)] truncate'>
														{don.donorName}
													</p>
													<div className='flex items-center gap-1 text-[10px] text-[var(--color-ngo-text-muted)]'>
														<MapPin size={10} />
														<span className='truncate'>{don.donorAddress.split(',')[0]}</span>
														<span className='mx-0.5'>·</span>
														<span>{(don.distance! / 1000).toFixed(1)} km</span>
													</div>
												</div>
											</div>

											<div className='mt-auto space-y-2'>
												{/* Expiry info */}
												<div className='flex items-center gap-2 text-xs p-2 rounded bg-[var(--color-ngo-bg)] border border-[var(--color-ngo-border-subtle)]'>
													<Clock size={14} className={don.urgency === 'critical' ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-accent)]'} />
													<div className='flex-1 flex justify-between items-center'>
														<span className='text-[var(--color-ngo-text-secondary)] font-medium'>Expires</span>
														<span className={cn('font-bold', don.urgency === 'critical' ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-text-primary)]')}>
															{formatTimeIST(don.expiresAt)}
														</span>
													</div>
												</div>

												{/* Claim Button */}
												<Button
													className='w-full bg-[var(--color-ngo-accent-light)] hover:bg-[var(--color-ngo-accent)] text-[var(--color-ngo-accent)] hover:text-white border border-[var(--color-ngo-accent)]/20 transition-all font-semibold rounded-[var(--radius-md)]'
													size='sm'
												>
													View & Claim <ChevronRight size={14} className='ml-1' />
												</Button>
											</div>
										</CardContent>
									</Card>
								</motion.div>
							))}
						</motion.div>
					)}
				</div>

				{/* ── Filters Slide-over ── */}
				<AnimatePresence>
					{showFilters && (
						<>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={() => setShowFilters(false)}
								className='absolute inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden'
							/>
							<motion.div
								initial={{ x: '100%' }}
								animate={{ x: 0 }}
								exit={{ x: '100%' }}
								transition={{ type: 'spring', damping: 25, stiffness: 200 }}
								className='absolute top-0 right-0 bottom-0 w-full sm:w-80 bg-white shadow-2xl z-40 border-l border-[var(--color-ngo-border)] flex flex-col'
							>
								<div className='flex items-center justify-between p-4 border-b border-[var(--color-ngo-border)]'>
									<h3 className='font-bold text-[var(--color-ngo-text-primary)] font-[var(--font-display)] flex items-center gap-2'>
										<SlidersHorizontal size={16} /> Filters
									</h3>
									<Button variant='ghost' size='icon' onClick={() => setShowFilters(false)} className='text-[var(--color-ngo-text-muted)]'>
										<X size={18} />
									</Button>
								</div>
								
								<div className='flex-1 overflow-y-auto p-4 space-y-6'>
									{/* Urgency */}
									<div className='space-y-3'>
										<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Urgency Level</label>
										<div className='flex flex-wrap gap-2'>
											{[
												{ id: 'critical', label: 'Critical (< 3h)' },
												{ id: 'high', label: 'High (< 6h)' },
												{ id: 'medium', label: 'Medium' },
												{ id: 'low', label: 'Low' },
											].map((urg) => (
												<button
													key={urg.id}
													onClick={() => setUrgencyFilter(prev => prev.includes(urg.id) ? prev.filter(i => i !== urg.id) : [...prev, urg.id])}
													className={cn(
														'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
														urgencyFilter.includes(urg.id)
															? 'bg-[var(--color-ngo-accent)] text-white border-[var(--color-ngo-accent)] shadow-sm'
															: 'bg-white text-[var(--color-ngo-text-secondary)] border-[var(--color-ngo-border)]',
													)}
												>
													{urg.label}
												</button>
											))}
										</div>
									</div>

									{/* Distance */}
									<div className='space-y-3'>
										<div className='flex items-center justify-between'>
											<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Maximum Distance</label>
											<span className='text-xs font-bold text-[var(--color-ngo-accent)]'>{maxDistance} km</span>
										</div>
									<input
										type="range"
										min="1"
										max="50"
										value={maxDistance}
										onChange={(e) => setMaxDistance(Number(e.target.value))}
										className='w-full accent-[var(--color-ngo-accent)]'
									/>
									<div className='flex justify-between text-[10px] text-[var(--color-ngo-text-muted)]'>
										<span>1 km</span>
										<span>50 km</span>
									</div>
									</div>

									{/* Minimum Quantity */}
									<div className='space-y-3'>
										<div className='flex items-center justify-between'>
											<label className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Minimum Quantity</label>
											<span className='text-xs font-bold text-[var(--color-ngo-accent)]'>{minQuantity} kg</span>
										</div>
										<input
											type="range"
											min="0"
											max="50"
											step="5"
											value={minQuantity}
											onChange={(e) => setMinQuantity(Number(e.target.value))}
											className='w-full accent-[var(--color-ngo-accent)]'
										/>
										<div className='flex justify-between text-[10px] text-[var(--color-ngo-text-muted)]'>
											<span>Any</span>
											<span>50+ kg</span>
										</div>
									</div>
								</div>

								<div className='p-4 border-t border-[var(--color-ngo-border)] bg-[var(--color-ngo-bg)] flex gap-3'>
								<Button
									variant='outline'
									className='flex-1 border-[var(--color-ngo-border)]'
									onClick={() => {
										setUrgencyFilter([])
										setMaxDistance(50)
										setMinQuantity(0)
									}}
								>
										Reset
									</Button>
									<Button className='flex-[2] bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white' onClick={() => setShowFilters(false)}>
										Apply Filters
									</Button>
								</div>
							</motion.div>
						</>
					)}
				</AnimatePresence>

				{/* ── Claim Donation Detail Sheet ── */}
				<AnimatePresence>
					{selectedDonation && (
						<>
							<motion.div
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								onClick={closeSheet}
								className='fixed inset-0 bg-black/60 backdrop-blur-sm z-50'
							/>
							<motion.div
								initial={{ y: '100%' }}
								animate={{ y: 0 }}
								exit={{ y: '100%' }}
								transition={{ type: 'spring', damping: 25, stiffness: 200 }}
								className='fixed bottom-0 left-0 right-0 h-[85vh] md:h-auto md:max-h-[85vh] md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-xl bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col border border-[var(--color-ngo-border)]'
							>
								{/* Step 1: Details */}
								{claimStep === 1 && (
									<>
										{/* Image Header */}
										<div className='relative h-48 md:h-56 flex-shrink-0 bg-black'>
											<img src={selectedDonation.images[0]} alt={selectedDonation.foodName} className='w-full h-full object-cover opacity-80' />
											<div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent' />
											<Button
												variant='ghost'
												size='icon'
												onClick={closeSheet}
												className='absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full h-8 w-8 backdrop-blur-sm'
											>
												<X size={16} />
											</Button>
											
											<div className='absolute bottom-4 left-4 right-4'>
												<div className='flex gap-2 mb-2'>
													<UrgencyBadge urgency={selectedDonation.urgency} />
													<Badge className='bg-white/20 text-white backdrop-blur-sm border-white/10 text-[10px]'>
														{selectedDonation.category}
													</Badge>
												</div>
												<h2 className='text-xl md:text-2xl font-bold font-[var(--font-display)] text-white leading-tight'>
													{selectedDonation.foodName}
												</h2>
												<p className='text-sm text-white/80 mt-1 flex items-center gap-1.5'>
													<Building2 size={14} /> {selectedDonation.donorName}
												</p>
											</div>
										</div>

										{/* Content */}
										<div className='flex-1 overflow-y-auto p-5 space-y-6'>
											<p className='text-sm text-[var(--color-ngo-text-secondary)] leading-relaxed'>
												{selectedDonation.description}
											</p>

											{/* Metrics Grid */}
											<div className='grid grid-cols-2 gap-3'>
												<div className='p-3 rounded-[var(--radius-lg)] bg-[var(--color-ngo-bg)] border border-[var(--color-ngo-border)]'>
													<div className='flex items-center gap-2 mb-1 text-[var(--color-ngo-text-muted)]'>
														<Weight size={14} />
														<span className='text-xs'>Total Quantity</span>
													</div>
													<p className='font-bold text-lg text-[var(--color-ngo-text-primary)]'>{selectedDonation.quantityKg} kg</p>
													<p className='text-[10px] font-medium text-[var(--color-ngo-accent)]'>~{selectedDonation.servings} meals</p>
												</div>
												<div className='p-3 rounded-[var(--radius-lg)] bg-[var(--color-ngo-bg)] border border-[var(--color-ngo-border)]'>
													<div className='flex items-center gap-2 mb-1 text-[var(--color-ngo-text-muted)]'>
														<Clock size={14} />
														<span className='text-xs'>Expires At</span>
													</div>
						<p className={cn('font-bold text-lg', selectedDonation.urgency === 'critical' ? 'text-[var(--color-error)]' : 'text-[var(--color-ngo-text-primary)]')}>
													{formatTimeIST(selectedDonation.expiresAt)}
													</p>
													<p className='text-[10px] text-[var(--color-ngo-text-muted)]'>Must be consumed by</p>
												</div>
											</div>

											{/* Logistics */}
											<div className='space-y-4 pt-4 border-t border-[var(--color-ngo-border)]'>
												<h3 className='font-semibold text-[var(--color-ngo-text-primary)] flex items-center gap-2'>
													<Truck size={16} className='text-[var(--color-ngo-accent)]' /> Pickup Details
												</h3>
												
												<div className='flex items-start gap-3'>
													<MapPin size={16} className='text-[var(--color-ngo-text-muted)] mt-0.5' />
													<div>
														<p className='text-sm font-medium text-[var(--color-ngo-text-primary)]'>{selectedDonation.donorAddress}</p>
														<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>{(selectedDonation.distance! / 1000).toFixed(1)} km away</p>
													</div>
												</div>

												<div className='flex items-start gap-3'>
													<Clock size={16} className='text-[var(--color-ngo-text-muted)] mt-0.5' />
													<div>
														<p className='text-sm font-medium text-[var(--color-ngo-text-primary)]'>
															{formatTimeIST(selectedDonation.pickupStart)} – {formatTimeIST(selectedDonation.pickupEnd)}
														</p>
														<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>Allowed pickup window</p>
													</div>
												</div>

												<div className='flex items-start gap-3'>
													<Info size={16} className='text-[var(--color-ngo-text-muted)] mt-0.5' />
													<div>
														<p className='text-sm font-medium text-[var(--color-ngo-text-primary)] capitalize'>
															{selectedDonation.packagingCondition} • {selectedDonation.storageType.replace('_', ' ')}
														</p>
														{selectedDonation.notes && <p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>{selectedDonation.notes}</p>}
													</div>
												</div>
											</div>

											{/* Environmental Impact preview */}
											<div className='p-3 rounded-[var(--radius-lg)] bg-[var(--color-ngo-eco-muted)] border border-[var(--color-ngo-eco-light)] flex items-center gap-3'>
												<Leaf size={24} className='text-[var(--color-success)] flex-shrink-0' />
												<div>
													<p className='text-sm font-semibold text-[var(--color-success)]'>Environmental Impact</p>
													<p className='text-xs text-[var(--color-ngo-text-muted)]'>Claiming this prevents <strong>{selectedDonation.co2SavedKg} kg</strong> of CO₂ emissions.</p>
												</div>
											</div>
										</div>

										<div className='p-4 border-t border-[var(--color-ngo-border)] bg-white'>
											{/* Capacity check */}
											{profile.pickupCapacityKg < selectedDonation.quantityKg ? (
												<div className='flex items-center gap-2 text-xs text-[var(--color-error)] mb-3 bg-[var(--color-error-light)] p-2 rounded'>
													<AlertCircle size={14} /> Exceeds your daily capacity ({profile.pickupCapacityKg}kg).
												</div>
											) : null}

											<Button
												className='w-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white h-12 text-base font-bold rounded-xl'
												onClick={() => setClaimStep(2)}
												disabled={profile.pickupCapacityKg < selectedDonation.quantityKg}
											>
												Claim Donation
											</Button>
										</div>
									</>
								)}

								{/* Step 2: Confirmation */}
								{claimStep === 2 && (
									<div className='flex flex-col h-full'>
										<div className='p-5 border-b border-[var(--color-ngo-border)] flex items-center'>
											<Button variant='ghost' size='icon' onClick={() => setClaimStep(1)} className='-ml-2 mr-2'>
												<ChevronLeft className='w-5 h-5' />
											</Button>
											<h3 className='font-bold text-lg font-[var(--font-display)]'>Confirm Claim</h3>
										</div>
										<div className='p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4'>
											<div className='w-20 h-20 rounded-full bg-[var(--color-warning-light)] flex items-center justify-center mb-2'>
												<HeartHandshake className='w-10 h-10 text-[var(--color-warning)]' />
											</div>
											<h4 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>Commitment Required</h4>
											<p className='text-[var(--color-ngo-text-secondary)] text-sm max-w-sm'>
												By claiming <strong>{selectedDonation.quantityKg}kg</strong> of food, you commit to picking it up before <strong>{formatTimeIST(selectedDonation.pickupEnd)}</strong>.
											</p>
											<div className='p-4 bg-[var(--color-ngo-bg)] rounded-[var(--radius-lg)] border border-[var(--color-ngo-border)] text-left w-full mt-4 space-y-2'>
												<div className='flex items-start gap-2 text-sm'>
													<CheckCircle2 size={16} className='text-[var(--color-success)] flex-shrink-0 mt-0.5' />
													<span className='text-[var(--color-ngo-text-secondary)]'>I have the capacity and required storage ({selectedDonation.storageType.replace('_', ' ')}).</span>
												</div>
												<div className='flex items-start gap-2 text-sm'>
													<CheckCircle2 size={16} className='text-[var(--color-success)] flex-shrink-0 mt-0.5' />
													<span className='text-[var(--color-ngo-text-secondary)]'>I will distribute this food safely before expiry ({formatTimeIST(selectedDonation.expiresAt)}).</span>
												</div>
											</div>
										</div>
										<div className='p-4 border-t border-[var(--color-ngo-border)] bg-white flex gap-3'>
											<Button variant='outline' className='flex-1' onClick={() => setClaimStep(1)}>Cancel</Button>
											<Button className='flex-[2] bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white' onClick={handleClaim}>
												Confirm & Claim
											</Button>
										</div>
									</div>
								)}

								{/* Step 3: Success */}
								{claimStep === 3 && (
									<motion.div
										variants={scaleIn}
										initial='hidden'
										animate='visible'
										className='flex flex-col items-center justify-center p-8 h-full text-center'
									>
										<div className='w-24 h-24 rounded-full bg-[var(--color-success)] flex items-center justify-center mb-6 shadow-lg shadow-[var(--color-success)]/30'>
											<CheckCircle2 className='w-12 h-12 text-white' />
										</div>
										<h3 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)] mb-2'>
											Donation Claimed!
										</h3>
										<p className='text-[var(--color-ngo-text-secondary)] mb-8 max-w-sm'>
											The donor has been notified. You can find the pickup details, location, and verification code in your Active Pickups queue.
										</p>
										<div className='w-full space-y-3'>
											<Link to='/ngo/pickups'>
												<Button className='w-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white h-12 text-base font-bold rounded-xl'>
													Go to Pickups
												</Button>
											</Link>
											<Button variant='ghost' className='w-full h-12 text-[var(--color-ngo-text-muted)]' onClick={closeSheet}>
												Find More Food
											</Button>
										</div>
									</motion.div>
								)}
							</motion.div>
						</>
					)}
				</AnimatePresence>
		</div>

		{/* ── AI Smart Match Panel ── */}
		<NGOMatchPanel open={aiMatchOpen} onClose={() => setAiMatchOpen(false)} />
	</div>
	)
}

function ChevronLeft({ className }: { className?: string }) {
	return (
		<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
			<path d="m15 18-6-6 6-6"/>
		</svg>
	)
}