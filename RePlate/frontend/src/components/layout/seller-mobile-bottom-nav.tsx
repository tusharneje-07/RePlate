import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	LayoutDashboard,
	UtensilsCrossed,
	ClipboardList,
	BarChart3,
	Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSellerStore } from '@/stores/seller-store'

const navItems = [
	{ to: '/seller/dashboard', icon: LayoutDashboard, label: 'Home' },
	{ to: '/seller/listings', icon: UtensilsCrossed, label: 'Listings' },
	{ to: '/seller/orders', icon: ClipboardList, label: 'Orders' },
	{ to: '/seller/analytics', icon: BarChart3, label: 'Analytics' },
	{ to: '/seller/notifications', icon: Bell, label: 'Alerts', badge: true },
]

export function SellerMobileBottomNav() {
	const location = useLocation()
	const { unreadCount } = useSellerStore()

	return (
		<nav className='lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-seller-surface)] border-t border-[var(--color-seller-border)] safe-area-pb'
			style={{ boxShadow: '0 -2px 16px 0 rgba(138,74,0,0.08)' }}
		>
			<div className='flex items-center justify-around px-2 py-2'>
				{navItems.map(({ to, icon: Icon, label, badge }) => {
					const isActive =
						to === '/seller/dashboard'
							? location.pathname === to
							: location.pathname.startsWith(to)
					const showBadge = badge && unreadCount > 0

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
											? 'text-[var(--color-seller-accent)]'
											: 'text-[var(--color-seller-text-muted)]',
									)}
									strokeWidth={isActive ? 2.5 : 2}
								/>
								{showBadge && (
									<span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[var(--color-seller-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
										{unreadCount > 9 ? '9+' : unreadCount}
									</span>
								)}
							</div>
							<span
								className={cn(
									'text-[10px] font-medium transition-colors duration-150',
									isActive
										? 'text-[var(--color-seller-accent)]'
										: 'text-[var(--color-seller-text-muted)]',
								)}
							>
								{label}
							</span>
							{isActive && (
								<motion.span
									layoutId='seller-mobile-nav-indicator'
									className='absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--color-seller-accent)] rounded-full'
								/>
							)}
						</Link>
					)
				})}
			</div>
		</nav>
	)
}
