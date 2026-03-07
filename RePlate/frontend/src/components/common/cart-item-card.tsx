import { Minus, Plus, Trash2, Leaf, Clock } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cart-store'
import { formatCurrency } from '@/lib/utils'
import type { CartItem as CartItemType } from '@/types'

interface CartItemProps {
	item: CartItemType
}

export function CartItemCard({ item }: CartItemProps) {
	const { updateQuantity, removeItem } = useCartStore()

	const pickupEnd = item.foodItem.pickupEnd ? new Date(item.foodItem.pickupEnd) : null
	const now = new Date()
	const minsLeft = pickupEnd ? Math.floor((pickupEnd.getTime() - now.getTime()) / 60000) : null
	const hoursLeft = minsLeft !== null ? Math.floor(minsLeft / 60) : null
	const timeLabel =
		minsLeft === null
			? 'See store hours'
			: minsLeft < 0
				? 'Expired'
				: minsLeft < 60
					? `${minsLeft}m left`
					: `${hoursLeft}h ${minsLeft % 60}m left`

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -20 }}
			className='flex gap-3 p-3.5 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)]'
		>
			{/* Image */}
			<div className='w-20 h-20 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 bg-[var(--color-border-subtle)]'>
				<img
					src={item.foodItem.images[0]}
					alt={item.foodItem.name}
					className='w-full h-full object-cover'
				/>
			</div>

			{/* Details */}
			<div className='flex-1 min-w-0 flex flex-col justify-between'>
				<div>
					<h4 className='font-semibold text-sm text-[var(--color-text-primary)] leading-tight line-clamp-2'>
						{item.foodItem.name}
					</h4>
					<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>{item.foodItem.seller.name}</p>
				</div>

				<div className='flex items-center justify-between mt-2 gap-2'>
					{/* Price */}
					<div>
						<span className='text-sm font-bold text-[var(--color-brand-accent)]'>
							{formatCurrency(item.subtotal)}
						</span>
						{item.quantity > 1 && (
							<span className='text-[10px] text-[var(--color-text-muted)] ml-1'>
								({formatCurrency(item.foodItem.discountedPrice)} each)
							</span>
						)}
					</div>

					{/* Qty controls */}
					<div className='flex items-center gap-1.5'>
						<button
							type='button'
							onClick={() => updateQuantity(item.id, item.quantity - 1)}
							className='w-6 h-6 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-accent-light)] hover:text-[var(--color-brand-accent)] hover:border-[var(--color-brand-accent)] transition-colors'
						>
							<Minus size={12} />
						</button>
						<span className='text-sm font-semibold text-[var(--color-text-primary)] min-w-[16px] text-center'>
							{item.quantity}
						</span>
						<button
							type='button'
							onClick={() => updateQuantity(item.id, item.quantity + 1)}
							className='w-6 h-6 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-accent-light)] hover:text-[var(--color-brand-accent)] hover:border-[var(--color-brand-accent)] transition-colors'
						>
							<Plus size={12} />
						</button>
						<button
							type='button'
							onClick={() => removeItem(item.id)}
							className='w-6 h-6 ml-1 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors'
						>
							<Trash2 size={12} />
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	)
}
