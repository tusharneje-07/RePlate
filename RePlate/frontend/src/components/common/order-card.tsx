import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Clock, MapPin, Leaf, CheckCircle2, Circle, XCircle, Package, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDateIST, formatTimeIST } from '@/lib/utils'
import { cardHover } from '@/lib/motion'
import type { Order, OrderStatus } from '@/types'

interface OrderCardProps {
	order: Order
}

const statusConfig: Record<
	OrderStatus,
	{ label: string; variant: 'success' | 'warning' | 'error' | 'muted' | 'default'; icon: typeof CheckCircle2 }
> = {
	pending: { label: 'Pending', variant: 'muted', icon: Circle },
	confirmed: { label: 'Confirmed', variant: 'default', icon: CheckCircle2 },
	preparing: { label: 'Preparing', variant: 'warning', icon: Package },
	ready_for_pickup: { label: 'Ready for Pickup', variant: 'success', icon: CheckCircle2 },
	completed: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
	cancelled: { label: 'Cancelled', variant: 'error', icon: XCircle },
}

export function OrderCard({ order }: OrderCardProps) {
	const config = statusConfig[order.status]
	const StatusIcon = config.icon
	const pickupDate = new Date(order.pickupTime)

	return (
		<motion.div
			variants={cardHover}
			initial='rest'
			whileHover='hover'
		>
			<Link
				to={`/consumer/orders/${order.id}`}
				className='flex flex-col gap-3 p-4 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)]'
			>
				{/* Header */}
				<div className='flex items-start justify-between gap-2'>
					<div className='min-w-0'>
						<p className='text-xs text-[var(--color-text-muted)] mb-0.5'>{order.orderNumber}</p>
						<h3 className='font-semibold text-sm text-[var(--color-text-primary)] truncate'>
							{order.seller.name}
						</h3>
					</div>
					<div className='flex items-center gap-2 flex-shrink-0'>
						<Badge variant={config.variant} className='gap-1'>
							<StatusIcon size={10} />
							{config.label}
						</Badge>
						<ChevronRight size={14} className='text-[var(--color-text-muted)]' />
					</div>
				</div>

				{/* Items summary */}
				<div className='flex items-center gap-2 overflow-hidden'>
					{order.items.slice(0, 3).map((item) => (
						<div
							key={item.id}
							className='w-10 h-10 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0 border border-[var(--color-border)]'
						>
							<img
								src={item.foodItem.images[0]}
								alt={item.foodItem.name}
								className='w-full h-full object-cover'
							/>
						</div>
					))}
					{order.items.length > 3 && (
						<span className='text-xs text-[var(--color-text-muted)] flex-shrink-0'>
							+{order.items.length - 3} more
						</span>
					)}
				</div>

				{/* Footer */}
				<div className='flex items-center justify-between text-[11px] text-[var(--color-text-muted)]'>
					<div className='flex items-center gap-3'>
						<span className='flex items-center gap-1'>
							<Clock size={10} />
						{formatDateIST(pickupDate, { day: 'numeric', month: 'short' })}{' '}
						{formatTimeIST(pickupDate)}
						</span>
						<span className='flex items-center gap-1 text-[var(--color-eco)]'>
							<Leaf size={10} />
							{order.co2Saved}kg CO₂
						</span>
					</div>
					<span className='font-semibold text-[var(--color-text-primary)] text-sm'>
						{formatCurrency(order.totalAmount)}
					</span>
				</div>
			</Link>
		</motion.div>
	)
}
