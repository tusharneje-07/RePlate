import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	LayoutDashboard,
	ShieldAlert,
	MessageSquareWarning,
	ClipboardCheck,
	History,
	ChartColumn,
	UserCircle2,
	Settings,
	ChevronLeft,
	ChevronRight,
	ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInspectorUIStore } from '@/stores/inspector-ui-store'
import { useInspectorStore } from '@/stores/inspector-store'

const navItems = [
	{ to: '/inspector/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
	{ to: '/inspector/listings', icon: ShieldAlert, label: 'Safety Monitoring', badge: 'alerts' },
	{ to: '/inspector/complaints', icon: MessageSquareWarning, label: 'Complaints', badge: 'complaints' },
	{ to: '/inspector/inspections', icon: ClipboardCheck, label: 'Field Inspections' },
	{ to: '/inspector/history', icon: History, label: 'Inspection History' },
	{ to: '/inspector/impact', icon: ChartColumn, label: 'Safety Impact' },
	{ to: '/inspector/profile', icon: UserCircle2, label: 'Profile' },
	{ to: '/inspector/settings', icon: Settings, label: 'Settings' },
]

export function InspectorSidebar() {
	const location = useLocation()
	const { sidebarOpen, toggleSidebar } = useInspectorUIStore()
	const { alerts, complaints, profile } = useInspectorStore()

	const unresolvedAlerts = alerts.filter((item) => !item.isResolved).length
	const activeComplaints = complaints.filter(
		(item) => item.status !== 'resolved' && item.status !== 'dismissed',
	).length

	return (
		<motion.aside
			animate={{ width: sidebarOpen ? 248 : 74 }}
			transition={{ duration: 0.25, ease: 'easeInOut' }}
			className='hidden lg:flex flex-col h-screen sticky top-0 bg-[var(--color-inspector-surface)] border-r border-[var(--color-inspector-border)] z-40 overflow-hidden'
			style={{ boxShadow: '2px 0 12px 0 rgba(31,77,143,0.06)' }}
		>
			<div className='flex items-center gap-3 px-4 py-5 border-b border-[var(--color-inspector-border)] min-h-[72px]'>
				<div className='flex-shrink-0 w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-inspector-accent)] flex items-center justify-center'>
					<ShieldCheck className='w-5 h-5 text-white' strokeWidth={2.4} />
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
							<span className='font-[var(--font-display)] font-bold text-lg text-[var(--color-inspector-text-primary)] tracking-tight leading-none'>
								Re<span className='text-[var(--color-inspector-accent)]'>Plate</span>
							</span>
							<p className='text-[10px] text-[var(--color-inspector-text-muted)] font-semibold mt-0.5 uppercase tracking-wider'>
								Inspector Portal
							</p>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			<nav className='flex-1 py-4 px-2 space-y-0.5 overflow-y-auto no-scrollbar'>
				{navItems.map(({ to, icon: Icon, label, badge }) => {
					const isActive =
						to === '/inspector/dashboard'
							? location.pathname === to
							: location.pathname.startsWith(to)

					let badgeCount = 0
					if (badge === 'alerts') badgeCount = unresolvedAlerts
					if (badge === 'complaints') badgeCount = activeComplaints
					const showBadge = badgeCount > 0

					return (
						<NavLink
							key={to}
							to={to}
							className={cn(
								'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-all duration-150',
								isActive
									? 'bg-[var(--color-inspector-accent-light)] text-[var(--color-inspector-accent)]'
									: 'text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface-elevated)] hover:text-[var(--color-inspector-text-primary)]',
							)}
						>
							{isActive && (
								<motion.span
									layoutId='inspector-sidebar-active'
									className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--color-inspector-accent)] rounded-r-full'
								/>
							)}

							<div className='relative flex-shrink-0'>
								<Icon
									className={cn('transition-colors', isActive && 'text-[var(--color-inspector-accent)]')}
									size={18}
								/>
								{!sidebarOpen && showBadge && (
									<span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-[var(--color-inspector-risk-critical)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
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

							{sidebarOpen && showBadge && (
								<motion.span
									initial={{ opacity: 0, scale: 0.85 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.85 }}
									className='ml-auto min-w-[20px] h-5 bg-[var(--color-inspector-risk-critical)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5'
								>
									{badgeCount}
								</motion.span>
							)}
						</NavLink>
					)
				})}
			</nav>

			<AnimatePresence>
				{sidebarOpen && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='mx-3 mb-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-inspector-accent-light)] border border-[var(--color-inspector-border)]'
					>
						<div className='flex items-center gap-2 mb-1'>
							<ShieldCheck className='w-3.5 h-3.5 text-[var(--color-inspector-accent)]' />
							<span className='text-xs font-semibold text-[var(--color-inspector-accent)]'>
								Assigned Regions
							</span>
						</div>
						<p className='text-[11px] text-[var(--color-inspector-text-muted)] leading-snug'>
							{profile.assignedRegions.join(' · ')}
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			<button
				type='button'
				onClick={toggleSidebar}
				className='flex items-center justify-center h-10 w-full border-t border-[var(--color-inspector-border)] text-[var(--color-inspector-text-muted)] hover:bg-[var(--color-inspector-surface-elevated)] hover:text-[var(--color-inspector-accent)] transition-colors'
			>
				{sidebarOpen ? <ChevronLeft className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
			</button>
		</motion.aside>
	)
}
