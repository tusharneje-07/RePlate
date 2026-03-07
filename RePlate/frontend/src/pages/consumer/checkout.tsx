import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	CheckCircle2,
	Clock,
	MapPin,
	Leaf,
	CreditCard,
	Wallet,
	Smartphone,
	Banknote,
	ArrowRight,
	ChevronDown,
	ChevronUp,
	ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useCartStore } from '@/stores/cart-store'
import { useAuth } from '@/hooks/useAuth'
import { ordersApi } from '@/lib/api'
import { formatCurrency, formatPickupTime, cn } from '@/lib/utils'
import { staggerContainer, slideUp, scaleIn } from '@/lib/motion'

type PaymentMethod = 'upi' | 'card' | 'wallet' | 'cash'

interface PaymentOption {
	id: PaymentMethod
	label: string
	description: string
	icon: typeof CreditCard
}

const paymentOptions: PaymentOption[] = [
	{ id: 'upi', label: 'UPI', description: 'PhonePe, GPay, Paytm & more', icon: Smartphone },
	{ id: 'card', label: 'Credit / Debit Card', description: 'Visa, Mastercard, RuPay', icon: CreditCard },
	{ id: 'wallet', label: 'RePlate Wallet', description: 'Balance: ₹0.00', icon: Wallet },
	{ id: 'cash', label: 'Cash on Pickup', description: 'Pay directly at the store', icon: Banknote },
]

export function CheckoutPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { items, totalAmount, totalSavings, totalCo2Saved, clearCart } = useCartStore()
	const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('upi')
	const [upiId, setUpiId] = useState('')
	const [isPlacingOrder, setIsPlacingOrder] = useState(false)
	const [orderPlaced, setOrderPlaced] = useState(false)
	const [placedOrderId, setPlacedOrderId] = useState<string | null>(null)
	const [showItems, setShowItems] = useState(false)

	const platformFee = totalAmount > 0 ? 5 : 0
	const grandTotal = totalAmount + platformFee

	// Derived display values from auth user
	const displayName = user
		? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
		: ''
	const displayEmail = user?.email ?? ''
	const displayAvatar = user?.profilePictureUrl ?? null

	// Group by seller for pickup summary
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

	async function handlePlaceOrder() {
		setIsPlacingOrder(true)
		try {
			const { data } = await ordersApi.place({
				items: items.map((i) => ({
					food_listing_id: i.foodItem.id,
					quantity: i.quantity,
				})),
				payment_method: selectedPayment,
			})
			clearCart()
			setPlacedOrderId(data.id)
			setOrderPlaced(true)
		} catch {
			// TODO: show toast error
		} finally {
			setIsPlacingOrder(false)
		}
	}

	// ── Order Placed Success Screen ──────────────────────────
	if (orderPlaced) {
		return (
			<motion.div
				variants={scaleIn}
				initial='hidden'
				animate='visible'
				className='flex flex-col items-center justify-center gap-6 py-12 px-4 text-center'
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
					className='w-24 h-24 rounded-full bg-[var(--color-eco-muted)] flex items-center justify-center'
				>
					<CheckCircle2 size={48} className='text-[var(--color-eco)]' />
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
				>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						Order Placed!
					</h1>
					<p className='text-sm text-[var(--color-text-muted)] mt-1.5 max-w-sm mx-auto'>
						Your order has been confirmed. Head to the seller during the pickup window and show your QR code.
					</p>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.45 }}
					className='w-full max-w-sm p-4 bg-[var(--color-eco-muted)] rounded-[var(--radius-xl)] border border-[var(--color-eco-light)]'
				>
					<div className='flex items-center gap-3 justify-center'>
						<Leaf size={18} className='text-[var(--color-eco)]' />
						<div className='text-left'>
							<p className='text-sm font-bold text-[var(--color-eco)]'>
								You saved {totalCo2Saved.toFixed(1)} kg CO₂
							</p>
							<p className='text-xs text-[var(--color-text-muted)]'>
								And rescued {items.length} food item{items.length !== 1 ? 's' : ''} from waste
							</p>
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.6 }}
					className='flex flex-col gap-3 w-full max-w-sm'
				>
					<Button
						size='lg'
						className='w-full'
						onClick={() =>
							navigate(placedOrderId ? `/consumer/orders/${placedOrderId}` : '/consumer/orders')
						}
					>
						Track My Order
						<ArrowRight size={16} />
					</Button>
					<Button
						size='lg'
						variant='outline'
						className='w-full'
						onClick={() => navigate('/consumer/browse')}
					>
						Continue Browsing
					</Button>
				</motion.div>
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
			<motion.div variants={slideUp}>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					Checkout
				</h1>
				<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>Review and confirm your order</p>
			</motion.div>

			{/* Contact Info */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Contact</h2>
				<div className='flex items-center gap-3'>
					<div className='w-10 h-10 rounded-full overflow-hidden bg-[var(--color-border-subtle)] flex-shrink-0'>
						{displayAvatar ? (
							<img src={displayAvatar} alt={displayName} className='w-full h-full object-cover' />
						) : (
							<div className='w-full h-full bg-[var(--color-brand-secondary)] flex items-center justify-center text-sm font-bold'>
								{displayName[0] ?? '?'}
							</div>
						)}
					</div>
					<div>
						<p className='text-sm font-medium text-[var(--color-text-primary)]'>{displayName}</p>
						<p className='text-xs text-[var(--color-text-muted)]'>{displayEmail}</p>
					</div>
				</div>
			</motion.div>

			{/* Pickup Locations */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] px-4 pt-4 pb-3'>
					Pickup Details
				</h2>
				{sellerGroups.map((group, i) => (
					<div key={group.seller.id}>
						{i > 0 && <Separator />}
						<div className='px-4 py-3 space-y-2'>
							<div className='flex items-center gap-2'>
								<div className='w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-[var(--color-border-subtle)]'>
									{group.seller.logo ? (
										<img src={group.seller.logo} alt={group.seller.name} className='w-full h-full object-cover' />
									) : (
										<div className='w-full h-full bg-[var(--color-brand-secondary)] flex items-center justify-center text-xs font-bold'>
											{group.seller.name[0]}
										</div>
									)}
								</div>
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-medium text-[var(--color-text-primary)] truncate'>{group.seller.name}</p>
								</div>
								<Badge variant='secondary' className='text-[10px] flex-shrink-0'>
									{group.items.length} item{group.items.length !== 1 ? 's' : ''}
								</Badge>
							</div>
							<div className='flex items-start gap-2 ml-10'>
								<MapPin size={12} className='text-[var(--color-brand-accent)] mt-0.5 flex-shrink-0' />
								<p className='text-xs text-[var(--color-text-muted)]'>{group.seller.address}</p>
							</div>
							<div className='flex items-center gap-2 ml-10'>
								<Clock size={12} className='text-[var(--color-brand-accent)] flex-shrink-0' />
								<p className='text-xs text-[var(--color-text-muted)]'>
									{group.items[0].foodItem.pickupStart && group.items[0].foodItem.pickupEnd
										? `${formatPickupTime(new Date(group.items[0].foodItem.pickupStart))} – ${formatPickupTime(new Date(group.items[0].foodItem.pickupEnd))}`
										: 'See store hours'}
								</p>
							</div>
						</div>
					</div>
				))}

				{/* Collapsible items list */}
				<button
					type='button'
					onClick={() => setShowItems(!showItems)}
					className='w-full flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] transition-colors'
				>
					<span className='font-medium'>
						{showItems ? 'Hide items' : `Show ${items.length} item${items.length !== 1 ? 's' : ''}`}
					</span>
					{showItems ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
				</button>
				{showItems && (
					<div className='px-4 pb-4 space-y-2'>
						{items.map((item) => (
							<div key={item.id} className='flex items-center gap-3'>
								<div className='w-10 h-10 rounded-[var(--radius-sm)] overflow-hidden flex-shrink-0'>
									<img src={item.foodItem.images[0]} alt={item.foodItem.name} className='w-full h-full object-cover' />
								</div>
								<div className='flex-1 min-w-0'>
									<p className='text-xs font-medium text-[var(--color-text-primary)] truncate'>{item.foodItem.name}</p>
									<p className='text-xs text-[var(--color-text-muted)]'>× {item.quantity}</p>
								</div>
								<span className='text-xs font-semibold text-[var(--color-text-primary)] flex-shrink-0'>
									{formatCurrency(item.subtotal)}
								</span>
							</div>
						))}
					</div>
				)}
			</motion.div>

			{/* Payment Method */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Payment Method</h2>
				<div className='space-y-2'>
					{paymentOptions.map((option) => {
						const Icon = option.icon
						const isSelected = selectedPayment === option.id
						return (
							<button
								key={option.id}
								type='button'
								onClick={() => setSelectedPayment(option.id)}
								className={cn(
									'w-full flex items-center gap-3 p-3.5 rounded-[var(--radius-lg)] border transition-all text-left',
									isSelected
										? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent-light)]'
										: 'border-[var(--color-border)] hover:border-[var(--color-brand-accent-muted)] hover:bg-[var(--color-surface-elevated)]',
								)}
							>
								<div className={cn(
									'w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0',
									isSelected ? 'bg-[var(--color-brand-accent)]' : 'bg-[var(--color-border-subtle)]',
								)}>
									<Icon size={18} className={isSelected ? 'text-white' : 'text-[var(--color-text-secondary)]'} />
								</div>
								<div className='flex-1 min-w-0'>
									<p className={cn('text-sm font-medium', isSelected ? 'text-[var(--color-brand-accent)]' : 'text-[var(--color-text-primary)]')}>
										{option.label}
									</p>
									<p className='text-xs text-[var(--color-text-muted)]'>{option.description}</p>
								</div>
								<div className={cn(
									'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all',
									isSelected
										? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)]'
										: 'border-[var(--color-border)]',
								)} />
							</button>
						)
					})}
				</div>

				{/* UPI ID input */}
				{selectedPayment === 'upi' && (
					<motion.div
						initial={{ opacity: 0, y: -8 }}
						animate={{ opacity: 1, y: 0 }}
						className='mt-3'
					>
						<input
							type='text'
							value={upiId}
							onChange={(e) => setUpiId(e.target.value)}
							placeholder='yourname@upi'
							className='w-full h-10 px-3 text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-accent)] transition-colors'
						/>
					</motion.div>
				)}
			</motion.div>

			{/* Order Summary */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-4'
			>
				<h2 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Order Summary</h2>
				<div className='space-y-2.5 text-sm'>
					<div className='flex justify-between'>
						<span className='text-[var(--color-text-secondary)]'>Subtotal</span>
						<span>{formatCurrency(totalAmount)}</span>
					</div>
					<div className='flex justify-between text-[var(--color-success)]'>
						<span>Discount</span>
						<span className='font-semibold'>-{formatCurrency(totalSavings)}</span>
					</div>
					<div className='flex justify-between'>
						<span className='text-[var(--color-text-secondary)]'>Platform fee</span>
						<span>{formatCurrency(platformFee)}</span>
					</div>
					<Separator />
					<div className='flex justify-between font-bold'>
						<span className='text-[var(--color-text-primary)]'>Total</span>
						<span className='text-lg text-[var(--color-brand-accent)]'>{formatCurrency(grandTotal)}</span>
					</div>
				</div>
			</motion.div>

		{/* Security / info note */}
		<motion.div
			variants={slideUp}
			className='flex items-center gap-2 text-xs text-[var(--color-text-muted)]'
		>
			<ShieldCheck size={14} className='text-[var(--color-eco)] flex-shrink-0' />
			{selectedPayment === 'cash'
				? <span>Pay in cash directly at the seller when you pick up your order.</span>
				: <span>Your payment is secured with 256-bit encryption. RePlate never stores card details.</span>
			}
		</motion.div>

			{/* Place Order CTA */}
			<motion.div variants={slideUp}>
				<Button
					size='xl'
					className='w-full'
					onClick={handlePlaceOrder}
					disabled={isPlacingOrder || items.length === 0}
				>
					{isPlacingOrder ? (
						<>
							<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
							Placing Order...
						</>
					) : (
						<>
							{selectedPayment === 'cash' ? 'Place Order' : `Pay ${formatCurrency(grandTotal)}`}
							<ArrowRight size={18} />
						</>
					)}
				</Button>
				<p className='text-center text-xs text-[var(--color-text-muted)] mt-2'>
					By placing this order you agree to our Terms of Service
				</p>
			</motion.div>
		</motion.div>
	)
}
