import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	ShoppingBag,
	Leaf,
	ArrowRight,
	ChevronRight,
	MapPin,
	Clock,
	Trash2,
	Tag,
} from 'lucide-react'
import { CartItemCard } from '@/components/common/cart-item-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/stores/cart-store'
import { formatCurrency, formatPickupTime } from '@/lib/utils'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'

export function CartPage() {
	const navigate = useNavigate()
	const { items, totalItems, totalAmount, totalSavings, totalCo2Saved, clearCart } = useCartStore()
	const [promoInput, setPromoInput] = useState('')
	const [promoApplied, setPromoApplied] = useState(false)
	const [promoError, setPromoError] = useState('')

	// Group items by seller
	const bySeller = items.reduce<Record<string, typeof items>>((acc, item) => {
		const sid = item.foodItem.seller.id
		if (!acc[sid]) acc[sid] = []
		acc[sid].push(item)
		return acc
	}, {})

	const sellerGroups = Object.entries(bySeller).map(([, sellerItems]) => ({
		seller: sellerItems[0].foodItem.seller,
		items: sellerItems,
		subtotal: sellerItems.reduce((s, i) => s + i.subtotal, 0),
	}))

	const platformFee = totalAmount > 0 ? 5 : 0
	const promoDiscount = promoApplied ? Math.round(totalAmount * 0.1) : 0
	const grandTotal = totalAmount + platformFee - promoDiscount

	function handlePromo() {
		if (promoInput.trim().toLowerCase() === 'replate10') {
			setPromoApplied(true)
			setPromoError('')
		} else {
			setPromoError('Invalid promo code')
			setPromoApplied(false)
		}
	}

	if (items.length === 0) {
		return (
			<motion.div
				variants={fadeIn}
				initial='hidden'
				animate='visible'
				className='flex flex-col items-center justify-center gap-6 py-20 px-4 text-center'
			>
				<div className='w-24 h-24 rounded-full bg-[var(--color-brand-accent-light)] flex items-center justify-center'>
					<ShoppingBag size={40} className='text-[var(--color-brand-accent)]' />
				</div>
				<div>
					<h2 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						Your cart is empty
					</h2>
					<p className='text-sm text-[var(--color-text-muted)] mt-1.5 max-w-xs'>
						Discover surplus food near you and rescue a meal while saving money.
					</p>
				</div>
				<Button asChild size='lg'>
					<Link to='/consumer/browse'>
						Browse Food
						<ArrowRight size={16} />
					</Link>
				</Button>
			</motion.div>
		)
	}

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp} className='flex items-center justify-between'>
				<div>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						Your Cart
					</h1>
					<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>
						{totalItems} item{totalItems !== 1 ? 's' : ''} from {sellerGroups.length} seller{sellerGroups.length !== 1 ? 's' : ''}
					</p>
				</div>
				<button
					type='button'
					onClick={clearCart}
					className='flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors px-2 py-1'
				>
					<Trash2 size={13} />
					Clear all
				</button>
			</motion.div>

			{/* Eco savings banner */}
			<motion.div
				variants={slideUp}
				className='flex items-center gap-3 px-4 py-3 bg-[var(--color-eco-muted)] rounded-[var(--radius-lg)] border border-[var(--color-eco-light)]'
			>
				<div className='w-8 h-8 rounded-full bg-[var(--color-eco-light)] flex items-center justify-center flex-shrink-0'>
					<Leaf size={16} className='text-[var(--color-eco)]' />
				</div>
				<div>
					<p className='text-sm font-semibold text-[var(--color-eco)]'>
						You're saving {totalCo2Saved.toFixed(1)} kg of CO₂
					</p>
					<p className='text-xs text-[var(--color-text-muted)]'>
						Equivalent to {Math.round(totalCo2Saved * 4)} km not driven
					</p>
				</div>
			</motion.div>

			{/* Cart items grouped by seller */}
			<AnimatePresence>
				{sellerGroups.map((group) => (
					<motion.div
						key={group.seller.id}
						variants={slideUp}
						className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
					>
						{/* Seller header */}
						<div className='flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]'>
							<div className='w-9 h-9 rounded-full overflow-hidden bg-[var(--color-border-subtle)] flex-shrink-0'>
								{group.seller.logo ? (
									<img src={group.seller.logo} alt={group.seller.name} className='w-full h-full object-cover' />
								) : (
									<div className='w-full h-full bg-[var(--color-brand-secondary)] flex items-center justify-center text-xs font-bold'>
										{group.seller.name[0]}
									</div>
								)}
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-semibold text-[var(--color-text-primary)] truncate'>{group.seller.name}</p>
								<div className='flex items-center gap-1 text-xs text-[var(--color-text-muted)]'>
									<MapPin size={10} />
									<span className='truncate'>{group.seller.address}</span>
								</div>
							</div>
							<Link
								to={`/consumer/browse?seller=${group.seller.id}`}
								className='flex items-center gap-1 text-xs text-[var(--color-brand-accent)] font-medium hover:underline flex-shrink-0'
							>
								Add more
								<ChevronRight size={12} />
							</Link>
						</div>

						{/* Pickup window */}
						<div className='flex items-center gap-2 px-4 py-2 bg-[var(--color-brand-accent-light)]'>
							<Clock size={13} className='text-[var(--color-brand-accent)]' />
							<p className='text-xs text-[var(--color-brand-accent)] font-medium'>
								Pickup:{' '}
								{group.items[0].foodItem.pickupStart && group.items[0].foodItem.pickupEnd
									? `${formatPickupTime(new Date(group.items[0].foodItem.pickupStart))} – ${formatPickupTime(new Date(group.items[0].foodItem.pickupEnd))}`
									: 'See store hours'}
							</p>
						</div>

						{/* Items */}
						<div className='flex flex-col gap-0 px-3 py-2'>
							<AnimatePresence>
								{group.items.map((item, i) => (
									<div key={item.id}>
										<CartItemCard item={item} />
										{i < group.items.length - 1 && <div className='h-2' />}
									</div>
								))}
							</AnimatePresence>
						</div>

						{/* Group subtotal */}
						<div className='flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]'>
							<span className='text-xs text-[var(--color-text-muted)]'>Subtotal ({group.seller.name})</span>
							<span className='text-sm font-bold text-[var(--color-text-primary)]'>{formatCurrency(group.subtotal)}</span>
						</div>
					</motion.div>
				))}
			</AnimatePresence>

			{/* Promo Code */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<div className='flex items-center gap-2 mb-3'>
					<Tag size={15} className='text-[var(--color-brand-accent)]' />
					<p className='text-sm font-semibold text-[var(--color-text-primary)]'>Promo Code</p>
				</div>
				{promoApplied ? (
					<div className='flex items-center justify-between p-3 bg-[var(--color-eco-muted)] rounded-[var(--radius-md)] border border-[var(--color-eco-light)]'>
						<div>
							<p className='text-sm font-semibold text-[var(--color-eco)]'>REPLATE10 applied!</p>
							<p className='text-xs text-[var(--color-text-muted)]'>10% off your order</p>
						</div>
						<button
							type='button'
							onClick={() => { setPromoApplied(false); setPromoInput('') }}
							className='text-xs text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors'
						>
							Remove
						</button>
					</div>
				) : (
					<div className='flex gap-2'>
						<input
							type='text'
							value={promoInput}
							onChange={(e) => { setPromoInput(e.target.value); setPromoError('') }}
							placeholder='Enter promo code'
							className='flex-1 h-9 px-3 text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-accent)] transition-colors'
							onKeyDown={(e) => e.key === 'Enter' && handlePromo()}
						/>
						<Button size='sm' onClick={handlePromo} disabled={!promoInput.trim()}>
							Apply
						</Button>
					</div>
				)}
				{promoError && (
					<p className='text-xs text-[var(--color-error)] mt-1.5'>{promoError}</p>
				)}
				<p className='text-xs text-[var(--color-text-muted)] mt-2'>Try: REPLATE10</p>
			</motion.div>

			{/* Order Summary */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Order Summary</h3>
				<div className='space-y-2.5'>
					<div className='flex items-center justify-between text-sm'>
						<span className='text-[var(--color-text-secondary)]'>Items subtotal</span>
						<span className='text-[var(--color-text-primary)]'>{formatCurrency(totalAmount)}</span>
					</div>
					<div className='flex items-center justify-between text-sm'>
						<span className='text-[var(--color-text-secondary)]'>You save</span>
						<span className='text-[var(--color-success)] font-semibold'>-{formatCurrency(totalSavings)}</span>
					</div>
					<div className='flex items-center justify-between text-sm'>
						<span className='text-[var(--color-text-secondary)]'>Platform fee</span>
						<span className='text-[var(--color-text-primary)]'>{formatCurrency(platformFee)}</span>
					</div>
					{promoApplied && (
						<div className='flex items-center justify-between text-sm'>
							<span className='text-[var(--color-eco)]'>Promo (REPLATE10)</span>
							<span className='text-[var(--color-eco)] font-semibold'>-{formatCurrency(promoDiscount)}</span>
						</div>
					)}
					<Separator />
					<div className='flex items-center justify-between'>
						<span className='font-bold text-[var(--color-text-primary)]'>Total</span>
						<span className='font-bold text-lg text-[var(--color-brand-accent)]'>{formatCurrency(grandTotal)}</span>
					</div>
				</div>

				{/* Savings highlight */}
				<div className='mt-3 p-2.5 bg-[var(--color-brand-accent-light)] rounded-[var(--radius-md)] text-center'>
					<p className='text-xs text-[var(--color-brand-accent)] font-semibold'>
						You're saving {formatCurrency(totalSavings)} on this order!
					</p>
				</div>
			</motion.div>

			{/* CTA */}
			<motion.div variants={slideUp}>
				<Button
					size='xl'
					className='w-full'
					onClick={() => navigate('/consumer/checkout')}
				>
					Proceed to Checkout
					<ArrowRight size={18} />
				</Button>
				<p className='text-center text-xs text-[var(--color-text-muted)] mt-2'>
					Pickup only · No delivery charges
				</p>
			</motion.div>
		</motion.div>
	)
}
