import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { ShoppingCart, X, ChevronRight, AlertTriangle } from 'lucide-react'
import { useCartStore } from '@/stores/cart-store'
import { formatCurrency } from '@/lib/utils'

export function FloatingCartBar() {
	const location = useLocation()
	const navigate = useNavigate()
	const { items, totalItems, totalAmount, clearCart } = useCartStore()
	const [confirming, setConfirming] = useState(false)
	const [dismissed, setDismissed] = useState(false)

	// Reset dismissed state on route change so bar reappears on new pages
	useEffect(() => {
		setDismissed(false)
		setConfirming(false)
	}, [location.pathname])

	// Hide on cart, checkout pages
	const hidden =
		location.pathname === '/consumer/cart' ||
		location.pathname.startsWith('/consumer/checkout')

	const visible = !hidden && !dismissed && totalItems > 0

	// Get first seller name for context
	const sellerName = items[0]?.foodItem.seller.name ?? ''
	const sellerLogo = items[0]?.foodItem.seller.logo

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 420, damping: 34 }}
					className='fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg'
				>
					<AnimatePresence mode='wait'>
						{confirming ? (
							/* ── Confirmation state ── */
							<motion.div
								key='confirm'
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.96 }}
								transition={{ duration: 0.15 }}
								className='flex items-center gap-3 bg-[var(--color-text-primary)] text-white rounded-[var(--radius-full)] shadow-[var(--shadow-elevated)] px-4 py-2.5'
							>
								<AlertTriangle size={15} className='text-amber-400 flex-shrink-0' />
								<p className='flex-1 text-sm font-medium leading-tight'>
									Clear cart and close?
								</p>
								<button
									type='button'
									onClick={() => { clearCart(); setDismissed(true); setConfirming(false) }}
									className='text-xs font-bold px-3 py-1.5 bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] rounded-full transition-colors flex-shrink-0'
								>
									Close
								</button>
								<button
									type='button'
									onClick={() => setConfirming(false)}
									className='text-xs font-semibold px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-full transition-colors flex-shrink-0'
								>
									Keep
								</button>
							</motion.div>
						) : (
							/* ── Default state ── */
							<motion.div
								key='default'
								initial={{ opacity: 0, scale: 0.96 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.96 }}
								transition={{ duration: 0.15 }}
								className='flex items-center gap-3 bg-[var(--color-text-primary)] text-white rounded-[var(--radius-full)] shadow-[var(--shadow-elevated)] px-3 py-2.5'
							>
								{/* Seller logo */}
								<div className='w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0 bg-[var(--color-brand-secondary)]'>
									{sellerLogo ? (
										<img src={sellerLogo} alt={sellerName} className='w-full h-full object-cover' />
									) : (
										<div className='w-full h-full flex items-center justify-center'>
											<ShoppingCart size={16} className='text-[var(--color-brand-accent)]' />
										</div>
									)}
								</div>

								{/* Info */}
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-semibold leading-tight truncate'>{sellerName}</p>
									<p className='text-xs text-white/60 leading-tight'>
										{totalItems} item{totalItems !== 1 ? 's' : ''} &middot; {formatCurrency(totalAmount)}
									</p>
								</div>

								{/* View Cart CTA */}
								<button
									type='button'
									onClick={() => navigate('/consumer/cart')}
									className='flex items-center gap-1.5 bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-white text-sm font-bold px-4 py-2 rounded-[var(--radius-full)] transition-colors flex-shrink-0'
								>
									View Cart
									<ChevronRight size={14} />
								</button>

								{/* Dismiss — triggers confirmation */}
								<button
									type='button'
									onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
									className='w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0'
									aria-label='Close cart bar'
								>
									<X size={13} />
								</button>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
