import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	LayoutDashboard,
	Search,
	Truck,
	LineChart,
	Bell,
	Building2,
	Settings,
	ChevronLeft,
	ChevronRight,
	Leaf,
	HeartHandshake,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNGOUIStore } from '@/stores/ngo-ui-store'
import { useNGOStore } from '@/stores/ngo-store'

const navItems = [
	{ to: '/ngo/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
	{ to: '/ngo/discover', icon: Search, label: 'Discover Donations' },
	{ to: '/ngo/pickups', icon: Truck, label: 'Active Pickups', badge: 'pickups' },
	{ to: '/ngo/impact', icon: LineChart, label: 'Impact & History' },
	{ to: '/ngo/notifications', icon: Bell, label: 'Notifications', badge: 'notifications' },
	{ to: '/ngo/profile', icon: Building2, label: 'Organisation Profile' },
	{ to: '/ngo/settings', icon: Settings, label: 'Settings' },
]

export function NGOSidebar() {
	const { sidebarOpen, toggleSidebar } = useNGOUIStore()
	const { unreadCount, pickups, profile } = useNGOStore()
	const location = useLocation()

	const activePickupsCount = pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length

	return (
		<motion.aside
			animate={{ width: sidebarOpen ? 240 : 72 }}
			transition={{ duration: 0.25, ease: 'easeInOut' }}
			className='hidden lg:flex flex-col h-screen sticky top-0 bg-[var(--color-ngo-surface)] border-r border-[var(--color-ngo-border)] z-40 overflow-hidden'
			style={{ boxShadow: '2px 0 12px 0 rgba(0,144,34,0.04)' }}
		>
			{/* Logo */}
			<div className='flex items-center gap-3 px-4 py-5 border-b border-[var(--color-ngo-border)] min-h-[72px]'>
				<div className='flex-shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-ngo-accent)] flex items-center justify-center'>
					<Leaf className='w-5 h-5 text-white' strokeWidth={2.5} />
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
							<span className='font-[var(--font-display)] font-bold text-lg text-[var(--color-ngo-text-primary)] tracking-tight leading-none'>
								Re<span className='text-[var(--color-ngo-accent)]'>Plate</span>
							</span>
							<p className='text-[10px] text-[var(--color-ngo-text-muted)] font-semibold mt-0.5 uppercase tracking-wider'>
								NGO Portal
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Nav */}
			<nav className='flex-1 py-4 px-2 space-y-0.5 overflow-y-auto no-scrollbar'>
				{navItems.map(({ to, icon: Icon, label, badge }) => {
					const isActive =
						to === '/ngo/dashboard'
							? location.pathname === to
							: location.pathname.startsWith(to)
					
					let badgeCount = 0
					if (badge === 'notifications') badgeCount = unreadCount
					if (badge === 'pickups') badgeCount = activePickupsCount
					const showBadge = badgeCount > 0

					return (
						<NavLink
							key={to}
							to={to}
							className={cn(
								'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-150',
								isActive
									? 'bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)]'
									: 'text-[var(--color-ngo-text-secondary)] hover:bg-[var(--color-ngo-surface-elevated)] hover:text-[var(--color-ngo-text-primary)]',
							)}
						>
							{/* Active indicator */}
							{isActive && (
								<motion.span
									layoutId='ngo-sidebar-active'
									className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-ngo-accent)] rounded-r-full'
								/>
							)}

							<div className='relative flex-shrink-0'>
								<Icon
									className={cn(
										'transition-colors',
										isActive ? 'text-[var(--color-ngo-accent)]' : '',
									)}
									size={18}
								/>
								{!sidebarOpen && showBadge && (
									<span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[var(--color-ngo-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
										{badgeCount > 9 ? '9+' : badgeCount}
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
										className='truncate leading-none flex-1'
									>
										{label}
									</motion.span>
								)}
							</AnimatePresence>

							{/* Badge count when sidebar open */}
							{sidebarOpen && showBadge && (
								<AnimatePresence>
									<motion.span
										initial={{ opacity: 0, scale: 0.8 }}
										animate={{ opacity: 1, scale: 1 }}
										exit={{ opacity: 0, scale: 0.8 }}
										className='ml-auto min-w-[20px] h-5 bg-[var(--color-ngo-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5'
									>
										{badgeCount}
									</motion.span>
								</AnimatePresence>
							)}
						</NavLink>
					)
				})}
			</nav>

			{/* Eco Impact badge */}
			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='mx-3 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-ngo-eco-muted)] border border-[var(--color-ngo-eco-light)]'
					>
						<div className='flex items-center gap-2 mb-1'>
							<HeartHandshake className='w-3.5 h-3.5 text-[var(--color-success)]' />
							<span className='text-xs font-semibold text-[var(--color-success)]'>
								Our Impact
							</span>
						</div>
						<p className='text-[11px] text-[var(--color-ngo-text-muted)] leading-snug'>
							{profile.totalMealsServed.toLocaleString()} meals served · {profile.totalCo2PreventedKg.toLocaleString()} kg CO₂ prevented
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Toggle */}
			<button
				type='button'
				onClick={toggleSidebar}
				className='flex items-center justify-center h-10 w-full border-t border-[var(--color-ngo-border)] text-[var(--color-ngo-text-muted)] hover:bg-[var(--color-ngo-surface-elevated)] hover:text-[var(--color-ngo-accent)] transition-colors'
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