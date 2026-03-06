import { NavLink } from 'react-router-dom'
import {
	LayoutDashboard,
	ShieldAlert,
	MessageSquareWarning,
	ClipboardCheck,
	UserCircle2,
} from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useInspectorStore } from '@/stores/inspector-store'

const navItems = [
	{ to: '/inspector/dashboard', icon: LayoutDashboard, label: 'Home' },
	{ to: '/inspector/listings', icon: ShieldAlert, label: 'Listings' },
	{ to: '/inspector/complaints', icon: MessageSquareWarning, label: 'Cases', badge: 'complaints' },
	{ to: '/inspector/inspections', icon: ClipboardCheck, label: 'Field' },
	{ to: '/inspector/profile', icon: UserCircle2, label: 'Profile' },
]

export function InspectorMobileBottomNav() {
	const { complaints } = useInspectorStore()
	const activeCasesCount = complaints.filter(
		(item) => item.status !== 'resolved' && item.status !== 'dismissed',
	).length

	return (
		<nav
			className='lg:hidden fixed bottom-0 left-0 right-0 bg-[var(--color-inspector-surface)]/95 backdrop-blur-md border-t border-[var(--color-inspector-border)] z-40 pb-safe'
			style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
		>
			<ul className='flex items-center justify-around h-16 px-2'>
				{navItems.map(({ to, icon: Icon, label, badge }) => {
					const badgeCount = badge === 'complaints' ? activeCasesCount : 0

					return (
						<li key={to} className='flex-1 h-full'>
							<NavLink
								to={to}
								className={({ isActive }) =>
									cn(
										'relative w-full h-full flex flex-col items-center justify-center gap-1 transition-colors',
										isActive
											? 'text-[var(--color-inspector-accent)]'
											: 'text-[var(--color-inspector-text-muted)] hover:text-[var(--color-inspector-text-secondary)]',
									)
								}
							>
								{({ isActive }) => (
									<>
										{isActive && (
											<motion.span
												layoutId='inspector-mobile-nav-indicator'
												className='absolute top-0 w-8 h-1 bg-[var(--color-inspector-accent)] rounded-b-full'
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
												<span className='absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-[var(--color-inspector-risk-critical)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 border-2 border-[var(--color-inspector-surface)]'>
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
