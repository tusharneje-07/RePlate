import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	ArrowLeft,
	MapPin,
	Clock,
	Leaf,
	CheckCircle2,
	Circle,
	Package,
	XCircle,
	Phone,
	Navigation,
	Share2,
	ChevronRight,
	Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PickupQRCode } from '@/components/common/pickup-qr-code'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatCurrency, cn } from '@/lib/utils'
import { ordersApi } from '@/lib/api'
import { mapOrderOutToOrder } from '@/lib/mappers'
import type { OrderStatus } from '@/types'

const statusSteps: { status: OrderStatus; label: string; description: string }[] = [
	{ status: 'pending', label: 'Order Placed', description: 'We received your order' },
	{ status: 'confirmed', label: 'Confirmed', description: 'Seller confirmed your order' },
	{ status: 'preparing', label: 'Preparing', description: 'Seller is packing your items' },
	{ status: 'ready_for_pickup', label: 'Ready for Pickup', description: 'Head to the store now!' },
	{ status: 'completed', label: 'Completed', description: 'Picked up successfully' },
]

const STATUS_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed']

const statusBadgeConfig: Record<OrderStatus, { label: string; variant: 'success' | 'warning' | 'error' | 'muted' | 'default' }> = {
	pending: { label: 'Pending', variant: 'muted' },
	confirmed: { label: 'Confirmed', variant: 'default' },
	preparing: { label: 'Preparing', variant: 'warning' },
	ready_for_pickup: { label: 'Ready for Pickup', variant: 'success' },
	completed: { label: 'Completed', variant: 'success' },
	cancelled: { label: 'Cancelled', variant: 'error' },
}

export function OrderDetailPage() {
	const { orderId } = useParams<{ orderId: string }>()
	const navigate = useNavigate()

	const { data: order, isLoading } = useQuery({
		queryKey: ['order', orderId],
		queryFn: async () => {
			const { data } = await ordersApi.getById(orderId!)
			return mapOrderOutToOrder(data)
		},
		enabled: !!orderId,
		refetchInterval: 30_000,
	})

	const queryClient = useQueryClient()
	const cancelMutation = useMutation({
		mutationFn: () => ordersApi.cancel(orderId!),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['order', orderId] })
			queryClient.invalidateQueries({ queryKey: ['orders'] })
		},
	})

	if (isLoading) {
		return (
			<div className='flex items-center justify-center py-20'>
				<Loader2 size={28} className='animate-spin text-[var(--color-brand-accent)]' />
			</div>
		)
	}

	if (!order) {
		return (
			<div className='flex flex-col items-center gap-4 py-20 text-center px-4'>
				<p className='text-lg font-semibold text-[var(--color-text-primary)]'>Order not found</p>
				<p className='text-sm text-[var(--color-text-muted)]'>This order doesn't exist or has been removed.</p>
				<Button variant='outline' onClick={() => navigate('/consumer/orders')}>
					<ArrowLeft size={15} />
					Back to Orders
				</Button>
			</div>
		)
	}

	const badgeConfig = statusBadgeConfig[order.status]
	const isCancelled = order.status === 'cancelled'
	const canCancel = order.status === 'pending' || order.status === 'confirmed'
	const currentStep = STATUS_ORDER.indexOf(order.status)
	const pickupDate = new Date(order.pickupTime)

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Back + header */}
			<motion.div variants={slideUp} className='flex items-center gap-3'>
				<button
					type='button'
					onClick={() => navigate(-1)}
					className='w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors'
				>
					<ArrowLeft size={16} className='text-[var(--color-text-secondary)]' />
				</button>
				<div className='flex-1 min-w-0'>
					<h1 className='text-base font-bold font-[var(--font-display)] text-[var(--color-text-primary)] truncate'>
						{order.orderNumber}
					</h1>
					<div className='flex items-center gap-2 mt-0.5'>
						<Badge variant={badgeConfig.variant} className='text-[10px]'>{badgeConfig.label}</Badge>
						<span className='text-xs text-[var(--color-text-muted)]'>
							{new Date(order.placedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
						</span>
					</div>
				</div>
				<button
					type='button'
					className='w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors'
				>
					<Share2 size={15} className='text-[var(--color-text-secondary)]' />
				</button>
			</motion.div>

			{/* QR Code (if active/ready) */}
			{!isCancelled && (order.status === 'ready_for_pickup' || order.status === 'confirmed' || order.status === 'preparing') && (
				<motion.div variants={slideUp}>
					<PickupQRCode order={order} />
				</motion.div>
			)}

			{/* Cancellation notice */}
			{isCancelled && (
				<motion.div
					variants={slideUp}
					className='flex items-start gap-3 p-4 bg-[var(--color-error-light)] rounded-[var(--radius-xl)] border border-red-200'
				>
					<XCircle size={18} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
					<div>
						<p className='text-sm font-semibold text-[var(--color-error)]'>Order Cancelled</p>
						{order.cancelReason && (
							<p className='text-xs text-[var(--color-text-secondary)] mt-0.5'>{order.cancelReason}</p>
						)}
					</div>
				</motion.div>
			)}

			{/* Order Progress */}
			{!isCancelled && (
				<motion.div
					variants={slideUp}
					className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
				>
					<h2 className='text-sm font-semibold text-[var(--color-text-primary)] mb-4'>Order Progress</h2>
					<div className='space-y-0'>
						{statusSteps.map((step, i) => {
							const isCompleted = i <= currentStep
							const isActive = i === currentStep
							const isLast = i === statusSteps.length - 1

							return (
								<div key={step.status} className='flex gap-3'>
									{/* Timeline line + dot */}
									<div className='flex flex-col items-center'>
										<div className={cn(
											'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all',
											isActive
												? 'bg-[var(--color-brand-accent)] shadow-[0_0_0_4px_var(--color-brand-accent-light)]'
												: isCompleted
													? 'bg-[var(--color-eco)]'
													: 'bg-[var(--color-border-subtle)] border-2 border-[var(--color-border)]',
										)}>
											{isCompleted ? (
												<CheckCircle2 size={14} className='text-white' />
											) : (
												<Circle size={14} className='text-[var(--color-border)]' />
											)}
										</div>
										{!isLast && (
											<div className={cn(
												'w-0.5 flex-1 min-h-[24px] my-1',
												i < currentStep ? 'bg-[var(--color-eco)]' : 'bg-[var(--color-border-subtle)]',
											)} />
										)}
									</div>

									{/* Text */}
									<div className={cn('pb-4 flex-1 min-w-0', isLast ? 'pb-0' : '')}>
										<p className={cn(
											'text-sm font-semibold',
											isActive
												? 'text-[var(--color-brand-accent)]'
												: isCompleted
													? 'text-[var(--color-text-primary)]'
													: 'text-[var(--color-text-muted)]',
										)}>
											{step.label}
										</p>
										<p className={cn(
											'text-xs mt-0.5',
											isActive || isCompleted ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-border)]',
										)}>
											{step.description}
										</p>
									</div>
								</div>
							)
						})}
					</div>
				</motion.div>
			)}

			{/* Pickup Info */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4 space-y-3'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)]'>Pickup Info</h2>
				<div className='flex items-start gap-2.5'>
					<MapPin size={15} className='text-[var(--color-brand-accent)] mt-0.5 flex-shrink-0' />
					<div>
						<p className='text-sm font-medium text-[var(--color-text-primary)]'>{order.seller.name}</p>
						<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>{order.pickupAddress}</p>
					</div>
				</div>
				<div className='flex items-center gap-2.5'>
					<Clock size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
					<p className='text-sm text-[var(--color-text-secondary)]'>
						{pickupDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })},{' '}
						{pickupDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
					</p>
				</div>
				<div className='flex gap-2 pt-1'>
					<Button variant='outline' size='sm' className='flex-1 gap-1.5'>
						<Navigation size={13} />
						Directions
					</Button>
					<Button variant='outline' size='sm' className='flex-1 gap-1.5'>
						<Phone size={13} />
						Call Store
					</Button>
				</div>
			</motion.div>

			{/* Items */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] px-4 pt-4 pb-3'>Items Ordered</h2>
				{order.items.map((item, i) => (
					<div key={item.id}>
						{i > 0 && <Separator />}
						<div className='flex items-center gap-3 px-4 py-3'>
							<div className='w-12 h-12 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0'>
								<img src={item.foodItem.images[0]} alt={item.foodItem.name} className='w-full h-full object-cover' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-[var(--color-text-primary)] truncate'>{item.foodItem.name}</p>
								<p className='text-xs text-[var(--color-text-muted)]'>× {item.quantity} · {item.foodItem.unit}</p>
							</div>
							<span className='text-sm font-bold text-[var(--color-text-primary)] flex-shrink-0'>
								{formatCurrency(item.subtotal)}
							</span>
						</div>
					</div>
				))}
			</motion.div>

			{/* Bill */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Bill Details</h2>
				<div className='space-y-2.5 text-sm'>
					<div className='flex justify-between'>
						<span className='text-[var(--color-text-secondary)]'>Item total</span>
						<span>{formatCurrency(order.totalAmount + order.totalSavings)}</span>
					</div>
					<div className='flex justify-between text-[var(--color-success)]'>
						<span>Discount saved</span>
						<span className='font-semibold'>-{formatCurrency(order.totalSavings)}</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-[var(--color-text-secondary)]'>Platform fee</span>
						<span>{formatCurrency(5)}</span>
					</div>
					<Separator />
					<div className='flex justify-between font-bold'>
						<span>Total paid</span>
						<span className='text-[var(--color-brand-accent)]'>{formatCurrency(order.totalAmount)}</span>
					</div>
				</div>

				{/* Eco impact */}
				<div className='mt-3 flex items-center gap-2 p-2.5 bg-[var(--color-eco-muted)] rounded-[var(--radius-md)]'>
					<Leaf size={14} className='text-[var(--color-eco)] flex-shrink-0' />
					<p className='text-xs text-[var(--color-eco)] font-medium'>
						{order.co2Saved} kg CO₂ saved · {formatCurrency(order.totalSavings)} money saved
					</p>
				</div>
			</motion.div>

		{/* Cancel Order */}
		{canCancel && (
			<motion.div variants={slideUp}>
				<Button
					variant='outline'
					size='lg'
					className='w-full border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-light)]'
					onClick={() => cancelMutation.mutate()}
					disabled={cancelMutation.isPending}
				>
					{cancelMutation.isPending ? (
						<><Loader2 size={15} className='animate-spin' />Cancelling...</>
					) : (
						<><XCircle size={15} />Cancel Order</>
					)}
				</Button>
			</motion.div>
		)}

		{/* Reorder / browse */}
		<motion.div variants={slideUp} className='flex gap-3'>
			{order.status === 'completed' && (
				<Button variant='outline' size='lg' className='flex-1'>
					Reorder
				</Button>
			)}
			<Button asChild size='lg' className='flex-1'>
				<Link to='/consumer/browse'>
					Browse More
					<ChevronRight size={16} />
				</Link>
			</Button>
		</motion.div>
		</motion.div>
	)
}
