import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Bell,
	ShoppingBag,
	XCircle,
	Clock,
	AlertTriangle,
	Star,
	IndianRupee,
	Settings,
	CheckCheck,
	ChevronRight,
	Package,
	Inbox,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, fadeIn, slideUp } from '@/lib/motion'
import { useSellerStore } from '@/stores/seller-store'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { NotificationEventType } from '@/types'

// ── Notification config ──────────────────────────────────────
interface NotifConfig {
	icon: React.ReactNode
	iconBg: string
	iconColor: string
	accent: string
}

function getNotifConfig(type: NotificationEventType): NotifConfig {
	switch (type) {
		case 'new_order':
			return {
				icon: <ShoppingBag className='w-4 h-4' />,
				iconBg: 'bg-[var(--color-seller-accent-muted)]',
				iconColor: 'text-[var(--color-seller-accent)]',
				accent: 'border-l-[var(--color-seller-secondary)]',
			}
		case 'order_cancelled':
			return {
				icon: <XCircle className='w-4 h-4' />,
				iconBg: 'bg-red-50',
				iconColor: 'text-red-500',
				accent: 'border-l-red-300',
			}
		case 'pickup_reminder':
			return {
				icon: <Clock className='w-4 h-4' />,
				iconBg: 'bg-amber-50',
				iconColor: 'text-amber-600',
				accent: 'border-l-amber-300',
			}
		case 'listing_expiry':
			return {
				icon: <Package className='w-4 h-4' />,
				iconBg: 'bg-orange-50',
				iconColor: 'text-orange-500',
				accent: 'border-l-orange-300',
			}
		case 'low_stock':
			return {
				icon: <AlertTriangle className='w-4 h-4' />,
				iconBg: 'bg-yellow-50',
				iconColor: 'text-yellow-600',
				accent: 'border-l-yellow-400',
			}
		case 'new_review':
			return {
				icon: <Star className='w-4 h-4' />,
				iconBg: 'bg-[var(--color-seller-eco-muted)]',
				iconColor: 'text-[#2d8a4e]',
				accent: 'border-l-[var(--color-seller-eco-light)]',
			}
		case 'payment_received':
			return {
				icon: <IndianRupee className='w-4 h-4' />,
				iconBg: 'bg-blue-50',
				iconColor: 'text-blue-500',
				accent: 'border-l-blue-300',
			}
		case 'system':
		default:
			return {
				icon: <Settings className='w-4 h-4' />,
				iconBg: 'bg-[var(--color-seller-border-subtle)]',
				iconColor: 'text-[var(--color-seller-text-muted)]',
				accent: 'border-l-[var(--color-seller-border)]',
			}
	}
}

// ── Type label map ───────────────────────────────────────────
const TYPE_LABELS: Record<NotificationEventType, string> = {
	new_order: 'Order',
	order_cancelled: 'Cancelled',
	pickup_reminder: 'Pickup',
	listing_expiry: 'Expiry',
	low_stock: 'Stock',
	new_review: 'Review',
	payment_received: 'Payment',
	system: 'System',
}

// ── Filter tabs ──────────────────────────────────────────────
type FilterTab = 'all' | 'unread' | NotificationEventType

const FILTER_TABS: { value: FilterTab; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'unread', label: 'Unread' },
	{ value: 'new_order', label: 'Orders' },
	{ value: 'payment_received', label: 'Payments' },
	{ value: 'new_review', label: 'Reviews' },
	{ value: 'low_stock', label: 'Stock' },
]

// ── Notification card ────────────────────────────────────────
interface NotifCardProps {
	id: string
	type: NotificationEventType
	title: string
	message: string
	isRead: boolean
	createdAt: string
	actionUrl?: string
	onRead: (id: string) => void
}

function NotifCard({ id, type, title, message, isRead, createdAt, onRead }: NotifCardProps) {
	const cfg = getNotifConfig(type)

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, x: -20 }}
			transition={{ duration: 0.2 }}
			className={cn(
				'relative flex items-start gap-3 p-4 border-l-[3px] rounded-r-[var(--radius-lg)] bg-[var(--color-seller-surface-card)] cursor-pointer group transition-colors hover:bg-[var(--color-seller-accent-light)]',
				cfg.accent,
				!isRead && 'bg-[var(--color-seller-bg)]',
			)}
			onClick={() => !isRead && onRead(id)}
		>
			{/* Icon */}
			<div className={cn('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', cfg.iconBg)}>
				<span className={cfg.iconColor}>{cfg.icon}</span>
			</div>

			{/* Content */}
			<div className='flex-1 min-w-0'>
				<div className='flex items-start justify-between gap-2'>
					<div className='flex items-center gap-1.5 flex-wrap'>
						<span className='text-sm font-semibold text-[var(--color-seller-text-primary)] leading-snug'>{title}</span>
						<Badge
							className={cn(
								'text-[10px] px-1.5 py-0 border-0 font-medium leading-none h-4',
								cfg.iconBg,
								cfg.iconColor,
							)}
						>
							{TYPE_LABELS[type]}
						</Badge>
					</div>
					{/* Unread dot */}
					{!isRead && (
						<span className='w-2 h-2 rounded-full bg-[var(--color-seller-accent)] flex-shrink-0 mt-1.5' />
					)}
				</div>
				<p className='text-xs text-[var(--color-seller-text-secondary)] mt-1 leading-relaxed line-clamp-2'>{message}</p>
				<p className='text-[11px] text-[var(--color-seller-text-muted)] mt-1.5'>
					{formatRelativeTime(new Date(createdAt))}
				</p>
			</div>

			{/* Chevron */}
			<ChevronRight className='w-4 h-4 text-[var(--color-seller-text-disabled)] group-hover:text-[var(--color-seller-accent)] transition-colors flex-shrink-0 mt-2.5 self-start' />
		</motion.div>
	)
}

// ── Empty state ──────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
	return (
		<motion.div
			variants={fadeIn}
			className='flex flex-col items-center justify-center py-16 gap-3 text-center px-4'
		>
			<div className='w-14 h-14 rounded-full bg-[var(--color-seller-accent-light)] flex items-center justify-center'>
				<Inbox className='w-6 h-6 text-[var(--color-seller-accent)]' />
			</div>
			<p className='text-sm font-medium text-[var(--color-seller-text-secondary)]'>{message}</p>
			<p className='text-xs text-[var(--color-seller-text-muted)]'>Check back later for new activity.</p>
		</motion.div>
	)
}

// ── Main page ────────────────────────────────────────────────
export function SellerNotificationsPage() {
	const notifications = useSellerStore((s) => s.notifications)
	const unreadCount = useSellerStore((s) => s.unreadCount)
	const markNotificationRead = useSellerStore((s) => s.markNotificationRead)
	const markAllRead = useSellerStore((s) => s.markAllRead)

	const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

	// Filter logic
	const filtered = notifications.filter((n) => {
		if (activeFilter === 'all') return true
		if (activeFilter === 'unread') return !n.isRead
		return n.type === activeFilter
	})

	// Group by "Today" vs "Earlier"
	const now = Date.now()
	const todayMs = 24 * 60 * 60 * 1000
	const todayNotifs = filtered.filter((n) => now - new Date(n.createdAt).getTime() < todayMs)
	const earlierNotifs = filtered.filter((n) => now - new Date(n.createdAt).getTime() >= todayMs)

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='max-w-2xl mx-auto px-4 pb-24 pt-2'
		>
			{/* Header */}
			<motion.div variants={slideUp} className='flex items-start justify-between gap-3 mb-5'>
				<div>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						Notifications
					</h1>
					<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
						{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
					</p>
				</div>
				{unreadCount > 0 && (
					<button
						onClick={markAllRead}
						className='flex items-center gap-1.5 text-xs font-medium text-[var(--color-seller-accent)] hover:text-[var(--color-seller-accent-hover)] transition-colors mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)] rounded'
					>
						<CheckCheck className='w-3.5 h-3.5' />
						Mark all read
					</button>
				)}
			</motion.div>

			{/* Filter tabs (horizontal scroll) */}
			<motion.div variants={fadeIn} className='mb-4'>
				<div className='flex items-center gap-2 overflow-x-auto no-scrollbar pb-1'>
					{FILTER_TABS.map((tab) => {
						const isActive = activeFilter === tab.value
						const tabUnread = tab.value === 'unread' ? unreadCount : 0
						return (
							<button
								key={tab.value}
								onClick={() => setActiveFilter(tab.value)}
								className={cn(
									'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)]',
									isActive
										? 'bg-[var(--color-seller-accent)] text-white'
										: 'bg-[var(--color-seller-surface-card)] text-[var(--color-seller-text-secondary)] border border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)] hover:text-[var(--color-seller-accent)]',
								)}
							>
								{tab.label}
								{tab.value === 'unread' && unreadCount > 0 && (
									<span
										className={cn(
											'text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none',
											isActive ? 'bg-white text-[var(--color-seller-accent)]' : 'bg-[var(--color-seller-accent)] text-white',
										)}
									>
										{unreadCount}
									</span>
								)}
								{tabUnread === 0 && null}
							</button>
						)
					})}
				</div>
			</motion.div>

			{/* Notification list */}
			<motion.div variants={fadeIn}>
				{filtered.length === 0 ? (
					<EmptyState
						message={
							activeFilter === 'unread'
								? 'No unread notifications'
								: activeFilter === 'all'
									? 'No notifications yet'
									: `No ${FILTER_TABS.find((t) => t.value === activeFilter)?.label.toLowerCase()} notifications`
						}
					/>
				) : (
					<div className='space-y-1'>
						{/* Today group */}
						{todayNotifs.length > 0 && (
							<div className='mb-3'>
								<div className='flex items-center gap-2 mb-2 px-1'>
									<Bell className='w-3.5 h-3.5 text-[var(--color-seller-text-muted)]' />
									<span className='text-xs font-semibold uppercase tracking-wider text-[var(--color-seller-text-muted)]'>
										Today
									</span>
									<Separator className='flex-1 bg-[var(--color-seller-border-subtle)]' />
								</div>
								<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] overflow-hidden divide-y divide-[var(--color-seller-border-subtle)]'>
									<AnimatePresence mode='popLayout'>
										{todayNotifs.map((n) => (
											<NotifCard
												key={n.id}
												id={n.id}
												type={n.type}
												title={n.title}
												message={n.message}
												isRead={n.isRead}
												createdAt={n.createdAt}
												actionUrl={n.actionUrl}
												onRead={markNotificationRead}
											/>
										))}
									</AnimatePresence>
								</div>
							</div>
						)}

						{/* Earlier group */}
						{earlierNotifs.length > 0 && (
							<div>
								<div className='flex items-center gap-2 mb-2 px-1'>
									<Clock className='w-3.5 h-3.5 text-[var(--color-seller-text-muted)]' />
									<span className='text-xs font-semibold uppercase tracking-wider text-[var(--color-seller-text-muted)]'>
										Earlier
									</span>
									<Separator className='flex-1 bg-[var(--color-seller-border-subtle)]' />
								</div>
								<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] overflow-hidden divide-y divide-[var(--color-seller-border-subtle)]'>
									<AnimatePresence mode='popLayout'>
										{earlierNotifs.map((n) => (
											<NotifCard
												key={n.id}
												id={n.id}
												type={n.type}
												title={n.title}
												message={n.message}
												isRead={n.isRead}
												createdAt={n.createdAt}
												actionUrl={n.actionUrl}
												onRead={markNotificationRead}
											/>
										))}
									</AnimatePresence>
								</div>
							</div>
						)}
					</div>
				)}
			</motion.div>

			{/* Footer hint */}
			{filtered.length > 0 && (
				<motion.p variants={fadeIn} className='text-center text-xs text-[var(--color-seller-text-disabled)] mt-6'>
					Tap an unread notification to mark it as read
				</motion.p>
			)}
		</motion.div>
	)
}
