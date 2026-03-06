import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	LayoutDashboard,
	Search,
	ShoppingCart,
	HandHeart,
	Leaf,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartStore } from '@/stores/cart-store'

const navItems = [
	{ to: '/consumer/dashboard', icon: LayoutDashboard, label: 'Home' },
	{ to: '/consumer/browse', icon: Search, label: 'Browse' },
	{ to: '/consumer/cart', icon: ShoppingCart, label: 'Cart' },
	{ to: '/consumer/list-food', icon: HandHeart, label: 'Donate' },
	{ to: '/consumer/impact', icon: Leaf, label: 'Impact' },
]

export function MobileBottomNav() {
	const location = useLocation()
	const { totalItems } = useCartStore()

	return (
		<nav className='lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface-card)] border-t border-[var(--color-border)] shadow-[var(--shadow-nav)] safe-area-pb'>
			<div className='flex items-center justify-around px-2 py-2'>
				{navItems.map(({ to, icon: Icon, label }) => {
					const isActive =
						to === '/consumer/dashboard'
							? location.pathname === to
							: location.pathname.startsWith(to)
					const isCart = to === '/consumer/cart'

					return (
						<Link
							key={to}
							to={to}
							className='relative flex flex-col items-center gap-0.5 min-w-[52px] py-1 px-2 rounded-[var(--radius-md)] transition-colors'
						>
							<div className='relative'>
								<Icon
									size={20}
									className={cn(
										'transition-colors duration-150',
										isActive
											? 'text-[var(--color-brand-accent)]'
											: 'text-[var(--color-text-muted)]',
									)}
									strokeWidth={isActive ? 2.5 : 2}
								/>
								{isCart && totalItems > 0 && (
									<span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[var(--color-brand-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
										{totalItems > 9 ? '9+' : totalItems}
									</span>
								)}
							</div>
							<span
								className={cn(
									'text-[10px] font-medium transition-colors duration-150',
									isActive
										? 'text-[var(--color-brand-accent)]'
										: 'text-[var(--color-text-muted)]',
								)}
							>
								{label}
							</span>
							{isActive && (
								<motion.span
									layoutId='mobile-nav-indicator'
									className='absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--color-brand-accent)] rounded-full'
								/>
							)}
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
