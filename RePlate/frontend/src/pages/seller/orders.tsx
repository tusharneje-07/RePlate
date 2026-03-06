import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	ArrowLeft,
	CheckCircle2,
	Clock,
	Phone,
	ShoppingBag,
	QrCode,
	ChevronRight,
	Search,
	X,
	Check,
	AlertTriangle,
	Package,
	Truck,
	Star,
	XCircle,
	User,
	Leaf,
	IndianRupee,
	ScanLine,
	RefreshCw,
	Filter,
	MessageSquare,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp, fadeIn, scaleIn } from '@/lib/motion'
import { formatCurrency, formatRelativeTime, formatPickupTime } from '@/lib/utils'
import { useSellerStore } from '@/stores/seller-store'
import { useSellerUIStore } from '@/stores/seller-ui-store'
import type { SellerOrder, SellerOrderStatus } from '@/types'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const STATUS_TABS: { value: SellerOrderStatus | 'all'; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'pending', label: 'Pending' },
	{ value: 'confirmed', label: 'Confirmed' },
	{ value: 'ready_for_pickup', label: 'Ready' },
	{ value: 'completed', label: 'Completed' },
	{ value: 'cancelled', label: 'Cancelled' },
]

const STATUS_CONFIG: Record<
	SellerOrderStatus,
	{
		label: string
		shortLabel: string
		color: string
		bg: string
		border: string
		icon: React.ReactNode
		dotColor: string
	}
> = {
	pending: {
		label: 'Pending Confirmation',
		shortLabel: 'Pending',
		color: 'text-[var(--color-warning)]',
		bg: 'bg-[var(--color-warning-light)]',
		border: 'border-[var(--color-warning)]/30',
		icon: <Clock size={12} />,
		dotColor: 'bg-[var(--color-warning)] animate-pulse',
	},
	confirmed: {
		label: 'Confirmed',
		shortLabel: 'Confirmed',
		color: 'text-[var(--color-info)]',
		bg: 'bg-[var(--color-info-light)]',
		border: 'border-[var(--color-info)]/30',
		icon: <CheckCircle2 size={12} />,
		dotColor: 'bg-[var(--color-info)]',
	},
	preparing: {
		label: 'Preparing',
		shortLabel: 'Preparing',
		color: 'text-[var(--color-info)]',
		bg: 'bg-[var(--color-info-light)]',
		border: 'border-[var(--color-info)]/30',
		icon: <Package size={12} />,
		dotColor: 'bg-[var(--color-info)] animate-pulse',
	},
	ready_for_pickup: {
		label: 'Ready for Pickup',
		shortLabel: 'Ready',
		color: 'text-[var(--color-success)]',
		bg: 'bg-[var(--color-success-light)]',
		border: 'border-[var(--color-success)]/30',
		icon: <Truck size={12} />,
		dotColor: 'bg-[var(--color-success)] animate-pulse',
	},
	completed: {
		label: 'Completed',
		shortLabel: 'Done',
		color: 'text-[var(--color-success)]',
		bg: 'bg-[var(--color-success-light)]',
		border: 'border-[var(--color-success)]/30',
		icon: <CheckCircle2 size={12} />,
		dotColor: 'bg-[var(--color-success)]',
	},
	cancelled: {
		label: 'Cancelled',
		shortLabel: 'Cancelled',
		color: 'text-[var(--color-error)]',
		bg: 'bg-[var(--color-error-light)]',
		border: 'border-[var(--color-error)]/30',
		icon: <XCircle size={12} />,
		dotColor: 'bg-[var(--color-seller-text-muted)]',
	},
}

// Next action for each status
const NEXT_ACTION: Partial<
	Record<SellerOrderStatus, { label: string; next: SellerOrderStatus; color: string }>
> = {
	pending: { label: 'Confirm Order', next: 'confirmed', color: 'bg-[var(--color-info)] hover:bg-[var(--color-info)]/90 text-white' },
	confirmed: { label: 'Mark Ready', next: 'ready_for_pickup', color: 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white' },
	ready_for_pickup: { label: 'Complete', next: 'completed', color: 'bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white' },
}

// ─────────────────────────────────────────────────────────────
// QR Scanner Modal
// ─────────────────────────────────────────────────────────────
interface QRScannerProps {
	order: SellerOrder | null
	onClose: () => void
	onVerified: () => void
}

function QRScannerModal({ order, onClose, onVerified }: QRScannerProps) {
	const [step, setStep] = useState<'scan' | 'verified' | 'error'>('scan')
	const [scanning, setScanning] = useState(false)

	if (!order) return null

	const handleSimulateScan = () => {
		setScanning(true)
		setTimeout(() => {
			setScanning(false)
			setStep('verified')
		}, 1800)
	}

	const handleComplete = () => {
		onVerified()
		onClose()
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm'
				onClick={step === 'scan' ? onClose : undefined}
			>
				<motion.div
					initial={{ y: 40, opacity: 0, scale: 0.97 }}
					animate={{ y: 0, opacity: 1, scale: 1 }}
					exit={{ y: 40, opacity: 0, scale: 0.97 }}
					transition={{ type: 'spring', stiffness: 300, damping: 28 }}
					className='w-full max-w-sm bg-[var(--color-seller-surface)] rounded-[var(--radius-2xl)] overflow-hidden shadow-2xl'
					onClick={(e) => e.stopPropagation()}
				>
					{/* Header */}
					<div className='flex items-center justify-between px-5 pt-5 pb-3'>
						<div>
							<h2 className='text-base font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
								QR Verification
							</h2>
							<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
								{order.orderNumber}
							</p>
						</div>
						<button
							type='button'
							onClick={onClose}
							className='p-2 rounded-[var(--radius-md)] text-[var(--color-seller-text-muted)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
						>
							<X size={16} />
						</button>
					</div>

					<div className='px-5 pb-6'>
						{step === 'scan' && (
							<>
								{/* QR code display */}
								<div className='relative mx-auto w-52 h-52 mb-5 rounded-[var(--radius-xl)] overflow-hidden bg-white border-2 border-[var(--color-seller-border)] flex items-center justify-center'>
									{/* Simulated QR grid */}
									<div className='grid grid-cols-7 gap-[3px] p-3 opacity-80'>
										{Array.from({ length: 49 }).map((_, i) => {
											const corners = [0, 1, 2, 7, 8, 9, 14, 15, 16, 32, 33, 34, 39, 40, 41, 46, 47, 48]
											const isSolid = corners.includes(i) || Math.random() > 0.55
											return (
												<div
													key={i}
													className={cn(
														'w-3.5 h-3.5 rounded-[2px]',
														isSolid ? 'bg-[var(--color-seller-text-primary)]' : 'bg-transparent',
													)}
												/>
											)
										})}
									</div>

									{/* Scanning animation */}
									{scanning && (
										<motion.div
											initial={{ top: '10%' }}
											animate={{ top: ['10%', '85%', '10%'] }}
											transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
											className='absolute left-3 right-3 h-0.5 bg-[var(--color-seller-accent)] shadow-lg'
											style={{ boxShadow: '0 0 8px 2px var(--color-seller-accent)' }}
										/>
									)}
								</div>

								<p className='text-center text-xs text-[var(--color-seller-text-muted)] mb-5'>
									Ask the customer to show their QR code, then tap to verify pickup.
								</p>

								{/* Customer info strip */}
								<div className='flex items-center gap-3 p-3 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)] mb-4'>
									<Avatar className='w-9 h-9 flex-shrink-0'>
										<AvatarImage src={order.customer.avatar} />
										<AvatarFallback className='bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] font-bold text-xs'>
											{order.customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
										</AvatarFallback>
									</Avatar>
									<div className='flex-1 min-w-0'>
										<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] truncate'>
											{order.customer.name}
										</p>
										<p className='text-xs text-[var(--color-seller-text-muted)]'>
											{order.totalItems} item{order.totalItems > 1 ? 's' : ''} ·{' '}
											{formatCurrency(order.totalAmount)}
										</p>
									</div>
								</div>

								<Button
									className='w-full gap-2 bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white'
									onClick={handleSimulateScan}
									disabled={scanning}
								>
									{scanning ? (
										<>
											<RefreshCw size={15} className='animate-spin' /> Scanning...
										</>
									) : (
										<>
											<ScanLine size={15} /> Verify Customer QR
										</>
									)}
								</Button>
							</>
						)}

						{step === 'verified' && (
							<motion.div
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								className='flex flex-col items-center gap-4 py-4 text-center'
							>
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
									className='w-16 h-16 rounded-full bg-[var(--color-success-light)] flex items-center justify-center'
								>
									<Check size={32} className='text-[var(--color-success)]' />
								</motion.div>
								<div>
									<h3 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
										QR Verified!
									</h3>
									<p className='text-sm text-[var(--color-seller-text-muted)] mt-1'>
										{order.customer.name}'s QR code matches this order.
									</p>
								</div>
								<div className='w-full p-3 bg-[var(--color-success-light)] rounded-[var(--radius-lg)]'>
									<p className='text-xs font-semibold text-[var(--color-success)]'>
										{order.orderNumber} · {formatCurrency(order.totalAmount)}
									</p>
								</div>
								<Button
									className='w-full gap-2 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-white'
									onClick={handleComplete}
								>
									<CheckCircle2 size={15} /> Mark as Completed
								</Button>
							</motion.div>
						)}
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	)
}

// ─────────────────────────────────────────────────────────────
// Order Card (list view)
// ─────────────────────────────────────────────────────────────
interface OrderCardProps {
	order: SellerOrder
	onQRScan: (order: SellerOrder) => void
}

function OrderCard({ order, onQRScan }: OrderCardProps) {
	const { updateOrderStatus } = useSellerStore()
	const navigate = useNavigate()
	const cfg = STATUS_CONFIG[order.status]
	const nextAction = NEXT_ACTION[order.status]
	const minsToPickup = Math.floor(
		(new Date(order.pickupTime).getTime() - Date.now()) / 60000,
	)
	const isOverdue = minsToPickup < 0 && order.status !== 'completed' && order.status !== 'cancelled'
	const isUrgent = minsToPickup > 0 && minsToPickup < 30

	return (
		<motion.div variants={fadeIn} layout>
			<Card
				className={cn(
					'overflow-hidden border shadow-none transition-shadow hover:shadow-md cursor-pointer',
					order.status === 'pending' ? 'border-[var(--color-warning)]/40' : 'border-[var(--color-seller-border)]',
					order.status === 'cancelled' && 'opacity-70',
				)}
				onClick={() => navigate(`/seller/orders/${order.id}`)}
			>
				<CardContent className='p-3.5'>
					{/* Top row: order number + status + time */}
					<div className='flex items-start justify-between gap-2 mb-2.5'>
						<div className='flex items-center gap-2 min-w-0'>
							<span
								className={cn(
									'w-2 h-2 rounded-full flex-shrink-0',
									cfg.dotColor,
								)}
							/>
							<span className='text-xs font-mono font-semibold text-[var(--color-seller-text-muted)] truncate'>
								{order.orderNumber}
							</span>
						</div>
						<div className='flex items-center gap-2 flex-shrink-0'>
							<span
								className={cn(
									'flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
									cfg.color,
									cfg.bg,
									cfg.border,
								)}
							>
								{cfg.icon}
								{cfg.shortLabel}
							</span>
							<span className='text-[10px] text-[var(--color-seller-text-muted)]'>
								{formatRelativeTime(new Date(order.placedAt))}
							</span>
						</div>
					</div>

					{/* Customer + amount row */}
					<div className='flex items-center gap-3 mb-2.5'>
						<Avatar className='w-9 h-9 flex-shrink-0'>
							<AvatarImage src={order.customer.avatar} alt={order.customer.name} />
							<AvatarFallback className='bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] text-xs font-bold'>
								{order.customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<div className='flex-1 min-w-0'>
							<div className='flex items-center gap-2'>
								<p className='text-sm font-bold text-[var(--color-seller-text-primary)] truncate'>
									{order.customer.name}
								</p>
								{order.customer.totalOrdersWithSeller > 1 && (
									<span className='text-[9px] font-medium bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] px-1.5 py-0.5 rounded-full flex-shrink-0'>
										#{order.customer.totalOrdersWithSeller} visit
									</span>
								)}
							</div>
							<p className='text-xs text-[var(--color-seller-text-muted)] truncate mt-0.5'>
								{order.items.map((i) => `${i.quantity}× ${i.listingName}`).join(', ')}
							</p>
						</div>
						<div className='text-right flex-shrink-0'>
							<p className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
								{formatCurrency(order.totalAmount)}
							</p>
							<p className='text-[10px] text-[var(--color-seller-text-muted)]'>
								{order.totalItems} item{order.totalItems > 1 ? 's' : ''}
							</p>
						</div>
					</div>

					{/* Pickup time row */}
					<div className='flex items-center justify-between gap-2 mb-2.5'>
						<div
							className={cn(
								'flex items-center gap-1.5 text-xs font-medium',
								isOverdue
									? 'text-[var(--color-error)]'
									: isUrgent
										? 'text-[var(--color-warning)]'
										: 'text-[var(--color-seller-text-muted)]',
							)}
						>
							<Clock size={12} />
							{isOverdue ? (
								<span>Overdue · pickup was {formatPickupTime(new Date(order.pickupTime))}</span>
							) : (
								<span>
									Pickup: {formatPickupTime(new Date(order.pickupTime))} –{' '}
									{formatPickupTime(new Date(order.pickupWindowEnd))}
								</span>
							)}
						</div>
						{isUrgent && (
							<span className='text-[9px] font-bold text-[var(--color-warning)] bg-[var(--color-warning-light)] px-2 py-0.5 rounded-full flex-shrink-0'>
								{minsToPickup}m away
							</span>
						)}
					</div>

					{/* Customer note */}
					{order.customerNote && (
						<div className='mb-2.5 px-2.5 py-2 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-md)] text-xs text-[var(--color-seller-text-muted)] flex items-start gap-1.5'>
							<MessageSquare size={13} className='mt-0.5 flex-shrink-0 text-[var(--color-seller-text-muted)]' />
							<span className='italic line-clamp-1'>{order.customerNote}</span>
						</div>
					)}

					{/* Actions row */}
					{order.status !== 'cancelled' && order.status !== 'completed' && (
						<div className='flex items-center gap-2' onClick={(e) => e.stopPropagation()}>
							{nextAction && (
								<button
									type='button'
									onClick={() => updateOrderStatus(order.id, nextAction.next)}
									className={cn(
										'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold h-8 rounded-[var(--radius-md)] transition-colors',
										nextAction.color,
									)}
								>
									<Check size={13} />
									{nextAction.label}
								</button>
							)}
							{order.status === 'ready_for_pickup' && (
								<button
									type='button'
									onClick={() => onQRScan(order)}
									className='flex items-center justify-center gap-1.5 text-xs font-bold h-8 px-3 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
								>
									<QrCode size={13} />
									QR Scan
								</button>
							)}
							{order.status === 'pending' && (
								<button
									type='button'
									onClick={() => updateOrderStatus(order.id, 'cancelled')}
									className='flex items-center justify-center gap-1.5 text-xs font-medium h-8 px-3 rounded-[var(--radius-md)] text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors'
								>
									<X size={13} />
									Reject
								</button>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ─────────────────────────────────────────────────────────────
// Orders List Page
// ─────────────────────────────────────────────────────────────
export function SellerOrdersPage() {
	const { orders } = useSellerStore()
	const [activeTab, setActiveTab] = useState<SellerOrderStatus | 'all'>('all')
	const [search, setSearch] = useState('')
	const [qrOrder, setQrOrder] = useState<SellerOrder | null>(null)
	const { updateOrderStatus } = useSellerStore()

	const filtered = orders.filter((o) => {
		const matchesTab = activeTab === 'all' || o.status === activeTab
		const matchesSearch =
			!search ||
			o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
			o.customer.name.toLowerCase().includes(search.toLowerCase()) ||
			o.items.some((i) => i.listingName.toLowerCase().includes(search.toLowerCase()))
		return matchesTab && matchesSearch
	})

	// Sort: active first, then newest
	const sorted = [...filtered].sort((a, b) => {
		const activePriority: SellerOrderStatus[] = ['pending', 'ready_for_pickup', 'confirmed', 'preparing']
		const aActive = activePriority.includes(a.status)
		const bActive = activePriority.includes(b.status)
		if (aActive && !bActive) return -1
		if (!aActive && bActive) return 1
		return new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
	})

	// Counts for tabs
	const counts = STATUS_TABS.reduce<Record<string, number>>((acc, tab) => {
		acc[tab.value] =
			tab.value === 'all'
				? orders.length
				: orders.filter((o) => o.status === tab.value).length
		return acc
	}, {})

	// Summary stats (today)
	const todayRevenue = orders
		.filter((o) => o.status === 'completed')
		.reduce((s, o) => s + o.totalAmount, 0)
	const activeCount = orders.filter((o) =>
		['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status),
	).length
	const pendingCount = orders.filter((o) => o.status === 'pending').length

	return (
		<>
			<motion.div
				variants={staggerContainer}
				initial='hidden'
				animate='visible'
				className='space-y-5 pb-8'
			>
				{/* ── Header ── */}
				<motion.div variants={slideUp} className='flex items-start justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Orders
						</h1>
						<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
							{activeCount} active · {orders.length} total today
						</p>
					</div>
					{pendingCount > 0 && (
						<div className='flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-warning-light)] rounded-full border border-[var(--color-warning)]/30'>
							<span className='w-2 h-2 rounded-full bg-[var(--color-warning)] animate-pulse' />
							<span className='text-xs font-bold text-[var(--color-warning)]'>
								{pendingCount} need action
							</span>
						</div>
					)}
				</motion.div>

				{/* ── Summary stats strip ── */}
				<motion.div variants={slideUp} className='grid grid-cols-3 gap-2'>
					{[
						{
							label: 'Today\'s Revenue',
							value: formatCurrency(todayRevenue),
							color: 'text-[var(--color-seller-accent)]',
							bg: 'bg-[var(--color-seller-accent-light)]',
						},
						{
							label: 'Active Orders',
							value: String(activeCount),
							color: 'text-[var(--color-info)]',
							bg: 'bg-[var(--color-info-light)]',
						},
						{
							label: 'Completed',
							value: String(counts.completed ?? 0),
							color: 'text-[var(--color-success)]',
							bg: 'bg-[var(--color-success-light)]',
						},
					].map((s) => (
						<div
							key={s.label}
							className={cn(
								'rounded-[var(--radius-lg)] p-3 text-center',
								s.bg,
							)}
						>
							<p className={cn('text-lg font-bold font-[var(--font-display)]', s.color)}>
								{s.value}
							</p>
							<p className='text-[10px] text-[var(--color-seller-text-muted)] mt-0.5 leading-tight'>
								{s.label}
							</p>
						</div>
					))}
				</motion.div>

				{/* ── Search ── */}
				<motion.div variants={slideUp} className='relative'>
					<Search
						size={15}
						className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)]'
					/>
					<input
						type='text'
						placeholder='Search by order #, customer, item...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='w-full h-10 pl-9 pr-9 rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] text-sm text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-muted)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-2 focus:ring-[var(--color-seller-accent)]/20 transition-colors'
					/>
					{search && (
						<button
							type='button'
							onClick={() => setSearch('')}
							className='absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)] transition-colors'
						>
							<X size={14} />
						</button>
					)}
				</motion.div>

				{/* ── Status tabs (scrollable pill row) ── */}
				<motion.div variants={slideUp} className='flex gap-2 overflow-x-auto no-scrollbar pb-1'>
					{STATUS_TABS.map((tab) => {
						const count = counts[tab.value] ?? 0
						return (
							<button
								key={tab.value}
								type='button'
								onClick={() => setActiveTab(tab.value)}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 flex-shrink-0',
									activeTab === tab.value
										? 'bg-[var(--color-seller-accent)] text-white border-[var(--color-seller-accent)]'
										: 'bg-transparent text-[var(--color-seller-text-secondary)] border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)]',
								)}
							>
								{tab.label}
								{count > 0 && (
									<span
										className={cn(
											'w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold',
											activeTab === tab.value
												? 'bg-white/20 text-white'
												: 'bg-[var(--color-seller-surface-elevated)] text-[var(--color-seller-text-muted)]',
										)}
									>
										{count}
									</span>
								)}
							</button>
						)
					})}
				</motion.div>

				{/* ── Orders list ── */}
				{sorted.length === 0 ? (
					<motion.div
						variants={scaleIn}
						className='flex flex-col items-center gap-3 py-16 text-center'
					>
						<div className='w-14 h-14 rounded-2xl bg-[var(--color-seller-surface-elevated)] flex items-center justify-center'>
							<ShoppingBag size={24} className='text-[var(--color-seller-text-muted)]' />
						</div>
						<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
							{search ? 'No orders match your search' : 'No orders here'}
						</p>
						<p className='text-xs text-[var(--color-seller-text-muted)]'>
							{search ? 'Try clearing your search' : 'New orders will appear here'}
						</p>
					</motion.div>
				) : (
					<motion.div variants={staggerContainer} className='space-y-3'>
						{sorted.map((order) => (
							<OrderCard
								key={order.id}
								order={order}
								onQRScan={setQrOrder}
							/>
						))}
					</motion.div>
				)}

				<div className='h-4' />
			</motion.div>

			{/* QR Scanner Modal */}
			{qrOrder && (
				<QRScannerModal
					order={qrOrder}
					onClose={() => setQrOrder(null)}
					onVerified={() => {
						updateOrderStatus(qrOrder.id, 'completed')
						setQrOrder(null)
					}}
				/>
			)}
		</>
	)
}

// ─────────────────────────────────────────────────────────────
// Order Status Timeline
// ─────────────────────────────────────────────────────────────
const TIMELINE_STEPS: {
	status: SellerOrderStatus
	label: string
	icon: React.ReactNode
}[] = [
	{ status: 'pending', label: 'Order Placed', icon: <ShoppingBag size={14} /> },
	{ status: 'confirmed', label: 'Confirmed', icon: <CheckCircle2 size={14} /> },
	{ status: 'ready_for_pickup', label: 'Ready for Pickup', icon: <Package size={14} /> },
	{ status: 'completed', label: 'Picked Up', icon: <Truck size={14} /> },
]

const STATUS_STEP_INDEX: Partial<Record<SellerOrderStatus, number>> = {
	pending: 0,
	confirmed: 1,
	preparing: 1,
	ready_for_pickup: 2,
	completed: 3,
}

// ─────────────────────────────────────────────────────────────
// Order Detail Page
// ─────────────────────────────────────────────────────────────
export function SellerOrderDetailPage() {
	const { orderId } = useParams<{ orderId: string }>()
	const navigate = useNavigate()
	const { orders, updateOrderStatus } = useSellerStore()
	const [qrOpen, setQrOpen] = useState(false)
	const [cancelConfirm, setCancelConfirm] = useState(false)

	const order = orders.find((o) => o.id === orderId)

	if (!order) {
		return (
			<div className='flex flex-col items-center gap-4 py-20 text-center'>
				<AlertTriangle size={32} className='text-[var(--color-warning)]' />
				<p className='text-base font-semibold text-[var(--color-seller-text-primary)]'>
					Order not found
				</p>
				<Button
					variant='outline'
					onClick={() => navigate('/seller/orders')}
					className='gap-2 border-[var(--color-seller-border)]'
				>
					<ArrowLeft size={14} /> Back to Orders
				</Button>
			</div>
		)
	}

	const cfg = STATUS_CONFIG[order.status]
	const nextAction = NEXT_ACTION[order.status]
	const currentStep = STATUS_STEP_INDEX[order.status] ?? (order.status === 'cancelled' ? -1 : 3)
	const isCancelledOrDone = order.status === 'completed' || order.status === 'cancelled'
	const minsToPickup = Math.floor(
		(new Date(order.pickupTime).getTime() - Date.now()) / 60000,
	)

	return (
		<>
			<motion.div
				variants={staggerContainer}
				initial='hidden'
				animate='visible'
				className='space-y-5 pb-8'
			>
				{/* ── Back + header ── */}
				<motion.div variants={slideUp}>
					<button
						type='button'
						onClick={() => navigate('/seller/orders')}
						className='flex items-center gap-1.5 text-sm text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)] transition-colors mb-3'
					>
						<ArrowLeft size={14} /> All Orders
					</button>
					<div className='flex items-start justify-between gap-3'>
						<div>
							<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
								{order.orderNumber}
							</h1>
							<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
								Placed {formatRelativeTime(new Date(order.placedAt))}
							</p>
						</div>
						<span
							className={cn(
								'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border',
								cfg.color, cfg.bg, cfg.border,
							)}
						>
							{cfg.icon}
							{cfg.label}
						</span>
					</div>
				</motion.div>

				{/* ── Status Timeline ── */}
				{order.status !== 'cancelled' && (
					<motion.div variants={slideUp}>
						<Card className='border-[var(--color-seller-border)] shadow-none'>
							<CardContent className='p-4'>
								<div className='flex items-center'>
									{TIMELINE_STEPS.map((step, i) => {
										const isDone = i < currentStep
										const isActive = i === currentStep
										const isLast = i === TIMELINE_STEPS.length - 1

										return (
											<div key={step.status} className='flex items-center flex-1'>
												{/* Step circle */}
												<div className='flex flex-col items-center'>
													<div
														className={cn(
															'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
															isDone
																? 'bg-[var(--color-success)] text-white'
																: isActive
																	? 'bg-[var(--color-seller-accent)] text-white ring-4 ring-[var(--color-seller-accent)]/20'
																	: 'bg-[var(--color-seller-surface-elevated)] text-[var(--color-seller-text-muted)]',
														)}
													>
														{isDone ? <Check size={14} /> : step.icon}
													</div>
													<p
														className={cn(
															'text-[9px] font-semibold mt-1 text-center whitespace-nowrap',
															isDone || isActive
																? 'text-[var(--color-seller-text-primary)]'
																: 'text-[var(--color-seller-text-muted)]',
														)}
													>
														{step.label}
													</p>
												</div>

												{/* Connector line */}
												{!isLast && (
													<div className='flex-1 mx-1 mb-4'>
														<div
															className={cn(
																'h-0.5 w-full rounded-full transition-all duration-300',
																i < currentStep
																	? 'bg-[var(--color-success)]'
																	: 'bg-[var(--color-seller-border)]',
															)}
														/>
													</div>
												)}
											</div>
										)
									})}
								</div>
							</CardContent>
						</Card>
					</motion.div>
				)}

				{/* ── Pickup urgency alert ── */}
				{!isCancelledOrDone && minsToPickup > 0 && minsToPickup < 30 && (
					<motion.div
						variants={slideUp}
						className='flex items-center gap-3 px-4 py-3 bg-[var(--color-warning-light)] rounded-[var(--radius-xl)] border border-[var(--color-warning)]/30'
					>
						<AlertTriangle size={18} className='text-[var(--color-warning)] flex-shrink-0' />
						<p className='text-sm font-semibold text-[var(--color-warning)]'>
							Customer pickup window starts in {minsToPickup} minutes
						</p>
					</motion.div>
				)}

				{/* ── Customer Info ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none'>
						<CardContent className='p-4'>
							<p className='text-xs font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-3'>
								Customer
							</p>
							<div className='flex items-center gap-3'>
								<Avatar className='w-11 h-11 flex-shrink-0'>
									<AvatarImage src={order.customer.avatar} alt={order.customer.name} />
									<AvatarFallback className='bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] font-bold'>
										{order.customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
									</AvatarFallback>
								</Avatar>
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>
										{order.customer.name}
									</p>
									<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
										{order.customer.totalOrdersWithSeller} order{order.customer.totalOrdersWithSeller > 1 ? 's' : ''} with your store
									</p>
								</div>
								{order.customer.phone && (
									<a
										href={`tel:${order.customer.phone}`}
										className='flex items-center gap-1.5 text-xs font-semibold text-[var(--color-seller-accent)] hover:underline flex-shrink-0'
									>
										<Phone size={13} /> Call
									</a>
								)}
							</div>
							{order.customerNote && (
								<div className='mt-3 px-3 py-2.5 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)] text-xs text-[var(--color-seller-text-secondary)] flex items-start gap-2'>
									<MessageSquare size={13} className='flex-shrink-0 text-[var(--color-seller-text-muted)]' />
									<span className='italic'>{order.customerNote}</span>
								</div>
							)}
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Order Items ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none'>
						<CardContent className='p-4'>
							<p className='text-xs font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-3'>
								Items ({order.totalItems})
							</p>
							<div className='space-y-3'>
								{order.items.map((item) => (
									<div key={item.listingId} className='flex items-center gap-3'>
										{item.image ? (
											<img
												src={item.image}
												alt={item.listingName}
												className='w-12 h-12 rounded-[var(--radius-md)] object-cover flex-shrink-0'
											/>
										) : (
											<div className='w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-seller-surface-elevated)] flex items-center justify-center flex-shrink-0'>
												<Package size={16} className='text-[var(--color-seller-text-muted)]' />
											</div>
										)}
										<div className='flex-1 min-w-0'>
											<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] truncate'>
												{item.listingName}
											</p>
											<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
												{formatCurrency(item.unitPrice)} × {item.quantity}
											</p>
										</div>
										<p className='text-sm font-bold text-[var(--color-seller-text-primary)] flex-shrink-0'>
											{formatCurrency(item.subtotal)}
										</p>
									</div>
								))}
							</div>

							{/* Total */}
							<div className='mt-4 pt-3 border-t border-[var(--color-seller-border-subtle)] flex items-center justify-between'>
								<span className='text-sm font-bold text-[var(--color-seller-text-primary)]'>Total</span>
								<span className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-accent)]'>
									{formatCurrency(order.totalAmount)}
								</span>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Pickup Details ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none'>
						<CardContent className='p-4'>
							<p className='text-xs font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-3'>
								Pickup Window
							</p>
							<div className='flex items-center gap-3'>
								<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-accent-light)] flex items-center justify-center flex-shrink-0'>
									<Clock size={16} className='text-[var(--color-seller-accent)]' />
								</div>
								<div>
									<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
										{formatPickupTime(new Date(order.pickupTime))} –{' '}
										{formatPickupTime(new Date(order.pickupWindowEnd))}
									</p>
									<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
										{minsToPickup > 0
											? `Starts in ${minsToPickup < 60 ? `${minsToPickup} minutes` : `${Math.floor(minsToPickup / 60)}h ${minsToPickup % 60}m`}`
											: minsToPickup > -60
												? 'Window is currently open'
												: 'Window has passed'}
									</p>
								</div>
							</div>

							{/* QR Code display */}
							<div className='mt-3 pt-3 border-t border-[var(--color-seller-border-subtle)]'>
								<p className='text-xs text-[var(--color-seller-text-muted)] mb-2'>Order QR Code</p>
								<div className='flex items-center gap-3'>
									<div className='w-12 h-12 bg-white border border-[var(--color-seller-border)] rounded-[var(--radius-md)] flex items-center justify-center'>
										<QrCode size={28} className='text-[var(--color-seller-text-primary)]' />
									</div>
									<div className='flex-1'>
										<p className='text-xs font-mono font-semibold text-[var(--color-seller-text-secondary)]'>
											{order.qrCode}
										</p>
										<p className='text-[10px] text-[var(--color-seller-text-muted)] mt-0.5'>
											Customer shows this for pickup verification
										</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Timestamps ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none'>
						<CardContent className='p-4'>
							<p className='text-xs font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-3'>
								Timeline
							</p>
							<div className='space-y-2'>
								{[
									{ label: 'Order placed', time: order.placedAt, show: true },
									{ label: 'Confirmed', time: order.confirmedAt, show: !!order.confirmedAt },
									{ label: 'Completed', time: order.completedAt, show: !!order.completedAt },
								]
									.filter((t) => t.show)
									.map((t) => (
										<div key={t.label} className='flex items-center justify-between text-xs'>
											<span className='text-[var(--color-seller-text-muted)]'>{t.label}</span>
											<span className='font-semibold text-[var(--color-seller-text-primary)]'>
												{t.time ? formatRelativeTime(new Date(t.time)) : '—'}
											</span>
										</div>
									))}
								{order.cancelReason && (
									<div className='mt-2 pt-2 border-t border-[var(--color-seller-border-subtle)]'>
										<p className='text-xs text-[var(--color-error)] flex items-start gap-1.5'>
											<XCircle size={11} className='mt-0.5 flex-shrink-0' />
											{order.cancelReason}
										</p>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Action Buttons ── */}
				{!isCancelledOrDone && (
					<motion.div variants={slideUp} className='space-y-2'>
						{nextAction && (
							<Button
								className={cn(
									'w-full h-12 text-base font-bold gap-2',
									nextAction.color,
								)}
								onClick={() => updateOrderStatus(order.id, nextAction.next)}
							>
								<Check size={18} />
								{nextAction.label}
							</Button>
						)}

						{order.status === 'ready_for_pickup' && (
							<Button
								variant='outline'
								className='w-full gap-2 border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)]'
								onClick={() => setQrOpen(true)}
							>
								<QrCode size={16} />
								Verify Customer QR
							</Button>
						)}

						{!cancelConfirm ? (
							<button
								type='button'
								onClick={() => setCancelConfirm(true)}
								className='w-full text-center text-xs text-[var(--color-error)] hover:underline py-1'
							>
								Cancel this order
							</button>
						) : (
							<div className='flex gap-2'>
								<Button
									variant='outline'
									className='flex-1 border-[var(--color-seller-border)]'
									onClick={() => setCancelConfirm(false)}
								>
									Keep Order
								</Button>
								<Button
									variant='destructive'
									className='flex-1 gap-1.5'
									onClick={() => {
										updateOrderStatus(order.id, 'cancelled')
										navigate('/seller/orders')
									}}
								>
									<XCircle size={14} /> Confirm Cancel
								</Button>
							</div>
						)}
					</motion.div>
				)}

				<div className='h-4' />
			</motion.div>

			{/* QR Scanner Modal */}
			{qrOpen && (
				<QRScannerModal
					order={order}
					onClose={() => setQrOpen(false)}
					onVerified={() => {
						updateOrderStatus(order.id, 'completed')
						setQrOpen(false)
					}}
				/>
			)}
		</>
	)
}
