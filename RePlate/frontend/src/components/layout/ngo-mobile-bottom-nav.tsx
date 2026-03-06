import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Search, Truck, LineChart, Building2 } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useNGOStore } from '@/stores/ngo-store'

const navItems = [
	{ to: '/ngo/dashboard', icon: LayoutDashboard, label: 'Home' },
	{ to: '/ngo/discover', icon: Search, label: 'Discover' },
	{ to: '/ngo/pickups', icon: Truck, label: 'Pickups', badge: 'pickups' },
	{ to: '/ngo/impact', icon: LineChart, label: 'Impact' },
	{ to: '/ngo/profile', icon: Building2, label: 'Profile' },
]

export function NGOMobileBottomNav() {
	const { pickups } = useNGOStore()
	const activePickupsCount = pickups.filter(p => p.status !== 'completed' && p.status !== 'cancelled').length

	return (
		<nav
			className='lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-t border-[var(--color-ngo-border)] z-40 pb-safe'
			style={{
				paddingBottom: 'env(safe-area-inset-bottom)',
			}}
		>
			<ul className='flex items-center justify-around h-16 px-2'>
				{navItems.map(({ to, icon: Icon, label, badge }) => {
					let badgeCount = 0
					if (badge === 'pickups') badgeCount = activePickupsCount

					return (
						<li key={to} className='flex-1 h-full'>
							<NavLink
								to={to}
								className={({ isActive }) =>
									cn(
										'relative w-full h-full flex flex-col items-center justify-center gap-1 transition-colors',
										isActive
											? 'text-[var(--color-ngo-accent)]'
											: 'text-[var(--color-ngo-text-muted)] hover:text-[var(--color-ngo-text-secondary)]',
									)
								}
							>
								{({ isActive }) => (
									<>
										{isActive && (
											<motion.span
												layoutId='ngo-mobile-nav-indicator'
												className='absolute top-0 w-8 h-1 bg-[var(--color-ngo-accent)] rounded-b-full'
												transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
											/>
										)}
										<div className='relative'>
											<Icon
												size={20}
												strokeWidth={isActive ? 2.5 : 2}
												className={cn('transition-all', isActive && 'scale-110')}
											/>
											{badgeCount > 0 && (
												<span className='absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-[var(--color-ngo-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-[var(--color-ngo-surface)]'>
													{badgeCount > 9 ? '9+' : badgeCount}
												</span>
											)}
										</div>
										<span className='text-[10px] font-medium'>{label}</span>
									</>
								)}
							</NavLink>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}