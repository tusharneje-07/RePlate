import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	LayoutDashboard,
	Search,
	ShoppingCart,
	ClipboardList,
	Heart,
	Leaf,
	User,
	Settings,
	ChevronLeft,
	ChevronRight,
	Sprout,
	HandHeart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'

const navItems = [
	{ to: '/consumer/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
	{ to: '/consumer/browse', icon: Search, label: 'Browse' },
	{ to: '/consumer/cart', icon: ShoppingCart, label: 'Cart' },
	{ to: '/consumer/orders', icon: ClipboardList, label: 'Orders' },
	{ to: '/consumer/favorites', icon: Heart, label: 'Favourites' },
	{ to: '/consumer/impact', icon: Leaf, label: 'My Impact' },
	{ to: '/consumer/list-food', icon: HandHeart, label: 'List Surplus' },
	{ to: '/consumer/profile', icon: User, label: 'Profile' },
	{ to: '/consumer/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
	const { sidebarOpen, toggleSidebar } = useUIStore()
	const { totalItems } = useCartStore()
	const location = useLocation()

	return (
		<motion.aside
			animate={{ width: sidebarOpen ? 240 : 72 }}
			transition={{ duration: 0.25, ease: 'easeInOut' }}
			className='hidden lg:flex flex-col h-screen sticky top-0 bg-[var(--color-surface-card)] border-r border-[var(--color-border)] shadow-[var(--shadow-sidebar)] z-40 overflow-hidden'
		>
			{/* Logo */}
			<div className='flex items-center gap-3 px-4 py-5 border-b border-[var(--color-border)] min-h-[72px]'>
				<div className='flex-shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-accent)] flex items-center justify-center'>
					<Sprout className='w-5 h-5 text-white' strokeWidth={2.5} />
				</div>
				<AnimatePresence mode='wait'>
					{sidebarOpen && (
						<motion.div
							initial={{ opacity: 0, x: -8 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -8 }}
							transition={{ duration: 0.15 }}
							className='overflow-hidden'
						>
							<span className='font-[var(--font-display)] font-bold text-lg text-[var(--color-text-primary)] tracking-tight leading-none'>
								Re<span className='text-[var(--color-brand-accent)]'>Plate</span>
							</span>
							<p className='text-[10px] text-[var(--color-text-muted)] font-medium mt-0.5'>Consumer</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Nav */}
			<nav className='flex-1 py-4 px-2 space-y-0.5 overflow-y-auto no-scrollbar'>
				{navItems.map(({ to, icon: Icon, label }) => {
					const isActive =
						to === '/consumer/dashboard'
							? location.pathname === to
							: location.pathname.startsWith(to)
					const isCart = to === '/consumer/cart'
					return (
						<NavLink
							key={to}
							to={to}
							className={cn(
								'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-150',
								isActive
									? 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]'
									: 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]',
							)}
						>
							{/* Active indicator bar */}
							{isActive && (
								<motion.span
									layoutId='sidebar-active'
									className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-brand-accent)] rounded-r-full'
								/>
							)}

							<div className='relative flex-shrink-0'>
								<Icon
									className={cn(
										'w-4.5 h-4.5 transition-colors',
										isActive ? 'text-[var(--color-brand-accent)]' : '',
									)}
									size={18}
								/>
								{isCart && totalItems > 0 && (
									<span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[var(--color-brand-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
										{totalItems > 9 ? '9+' : totalItems}
									</span>
								)}
							</div>

							<AnimatePresence mode='wait'>
								{sidebarOpen && (
									<motion.span
										initial={{ opacity: 0, x: -6 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -6 }}
										transition={{ duration: 0.12 }}
										className='truncate leading-none'
									>
										{label}
									</motion.span>
								)}
							</AnimatePresence>
						</NavLink>
					)
				})}
			</nav>

			{/* Eco badge */}
			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='mx-3 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-eco-muted)] border border-[var(--color-eco-light)]'
					>
						<div className='flex items-center gap-2 mb-1'>
							<Leaf className='w-3.5 h-3.5 text-[var(--color-eco)]' />
							<span className='text-xs font-semibold text-[var(--color-eco)]'>Sapling Level</span>
						</div>
						<p className='text-[11px] text-[var(--color-text-muted)] leading-snug'>
							94.3 kg CO₂ saved. 32% to Tree!
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Toggle */}
			<button
				type='button'
				onClick={toggleSidebar}
				className='flex items-center justify-center h-10 w-full border-t border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-brand-accent)] transition-colors'
			>
				{sidebarOpen ? (
					<ChevronLeft className='w-4 h-4' />
				) : (
					<ChevronRight className='w-4 h-4' />
				)}
			</button>
		</motion.aside>
	)
}
