import { motion, AnimatePresence } from 'motion/react'
import {
	Bell,
	X,
	ShoppingBag,
	Tag,
	Heart,
	Leaf,
	Info,
	CheckCircle2,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

// Placeholder notifications — replace with real API data when consumer
// notifications backend is available.
const PLACEHOLDER_NOTIFICATIONS = [
	{
		id: '1',
		type: 'order',
		title: 'Order Picked Up',
		message: 'Your order from Green Bowl Kitchen has been picked up successfully.',
		time: '2 min ago',
		isRead: false,
	},
	{
		id: '2',
		type: 'deal',
		title: 'New Deal Near You',
		message: 'Sunrise Bakery is offering 60% off on pastries expiring today.',
		time: '1 hr ago',
		isRead: false,
	},
	{
		id: '3',
		type: 'impact',
		title: 'Impact Milestone',
		message: 'You\'ve saved 10 kg of food this month. Keep it up!',
		time: '3 hr ago',
		isRead: true,
	},
	{
		id: '4',
		type: 'system',
		title: 'Welcome to RePlate',
		message: 'Start browsing surplus food near you and make a difference today.',
		time: 'Yesterday',
		isRead: true,
	},
]

const iconForType = (type: string) => {
	switch (type) {
		case 'order': return ShoppingBag
		case 'deal': return Tag
		case 'favourite': return Heart
		case 'impact': return Leaf
		default: return Info
	}
}

const colorForType = (type: string) => {
	switch (type) {
		case 'order': return 'text-[var(--color-brand-accent)] bg-[var(--color-brand-accent-light)]'
		case 'deal': return 'text-[var(--color-warning)] bg-amber-50'
		case 'impact': return 'text-[var(--color-eco)] bg-[var(--color-eco-muted)]'
		default: return 'text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)]'
	}
}

export function ConsumerNotificationSheet() {
	const { notificationSheetOpen, setNotificationSheetOpen } = useUIStore()
	const unread = PLACEHOLDER_NOTIFICATIONS.filter((n) => !n.isRead).length

	return (
		<AnimatePresence>
			{notificationSheetOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						key='notif-backdrop'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
						onClick={() => setNotificationSheetOpen(false)}
					/>

					{/* Sheet — slides up from bottom on mobile, slides in from right on desktop */}
					<motion.aside
						key='notif-sheet'
						initial={{ y: '100%', opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: '100%', opacity: 0 }}
						transition={{ type: 'spring', damping: 28, stiffness: 260 }}
						className={cn(
							'fixed z-50 bg-[var(--color-surface-card)] shadow-2xl flex flex-col',
							// Mobile: full-width bottom sheet
							'bottom-0 left-0 right-0 rounded-t-[1.5rem] max-h-[85vh]',
							// Desktop: right-side panel
							'lg:top-0 lg:bottom-0 lg:left-auto lg:right-0 lg:w-[380px] lg:rounded-none lg:rounded-l-[1.5rem] lg:max-h-none',
						)}
					>
						{/* Handle bar (mobile only) */}
						<div className='lg:hidden flex justify-center pt-3 pb-1 flex-shrink-0'>
							<div className='w-10 h-1 rounded-full bg-[var(--color-border)]' />
						</div>

						{/* Header */}
						<div className='flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)] flex-shrink-0'>
							<div className='flex items-center gap-2'>
								<Bell size={20} className='text-[var(--color-brand-accent)]' />
								<h2 className='text-base font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
									Notifications
								</h2>
								{unread > 0 && (
									<span className='min-w-[20px] h-5 px-1.5 bg-[var(--color-brand-accent)] text-white text-[11px] font-bold rounded-full flex items-center justify-center'>
										{unread}
									</span>
								)}
							</div>
							<button
								type='button'
								onClick={() => setNotificationSheetOpen(false)}
								className='p-1.5 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
							>
								<X size={18} />
							</button>
						</div>

						{/* List */}
						<div className='flex-1 overflow-y-auto divide-y divide-[var(--color-border)]'>
							{PLACEHOLDER_NOTIFICATIONS.length === 0 ? (
								<div className='flex flex-col items-center justify-center py-16 px-8 text-center gap-3'>
									<div className='w-14 h-14 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center'>
										<Bell size={24} className='text-[var(--color-text-muted)]' />
									</div>
									<p className='font-semibold text-[var(--color-text-primary)]'>All caught up!</p>
									<p className='text-sm text-[var(--color-text-muted)]'>No new notifications right now.</p>
								</div>
							) : (
								PLACEHOLDER_NOTIFICATIONS.map((notif) => {
									const Icon = iconForType(notif.type)
									const iconCls = colorForType(notif.type)
									return (
										<div
											key={notif.id}
											className={cn(
												'flex items-start gap-3 px-5 py-4 transition-colors cursor-pointer',
												notif.isRead
													? 'bg-transparent hover:bg-[var(--color-surface-elevated)]'
													: 'bg-[var(--color-brand-accent-light)]/40 hover:bg-[var(--color-brand-accent-light)]/60',
											)}
										>
											{/* Icon bubble */}
											<div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', iconCls)}>
												<Icon size={16} />
											</div>

											{/* Content */}
											<div className='flex-1 min-w-0'>
												<div className='flex items-start justify-between gap-2'>
													<p className={cn('text-sm font-semibold leading-snug', notif.isRead ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]')}>
														{notif.title}
													</p>
													{!notif.isRead && (
														<span className='w-2 h-2 rounded-full bg-[var(--color-brand-accent)] flex-shrink-0 mt-1.5' />
													)}
												</div>
												<p className='text-xs text-[var(--color-text-secondary)] mt-0.5 leading-relaxed'>
													{notif.message}
												</p>
												<p className='text-[11px] text-[var(--color-text-muted)] mt-1.5 font-medium'>
													{notif.time}
												</p>
											</div>
										</div>
									)
								})
							)}
						</div>

						{/* Footer */}
						<div className='flex-shrink-0 px-5 py-4 border-t border-[var(--color-border)] flex items-center justify-between'>
							<p className='text-xs text-[var(--color-text-muted)]'>
								{unread > 0 ? `${unread} unread` : 'All read'}
							</p>
							{unread > 0 && (
								<button
									type='button'
									className='flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-accent)] hover:underline'
								>
									<CheckCircle2 size={13} />
									Mark all as read
								</button>
							)}
						</div>
					</motion.aside>
				</>
			)}
		</AnimatePresence>
	)
}
