import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Bell, BellOff, Package, Clock, QrCode, Cpu, CheckCircle2, CloudRain, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useNGOStore } from '@/stores/ngo-store'
import type { NGONotification } from '@/types'

// ── Icon map ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<
	string,
	{ icon: React.ReactNode; accent: string; bg: string; label: string }
> = {
	new_donation: {
		icon: <Package size={16} />,
		accent: 'var(--color-ngo-accent)',
		bg: 'var(--color-ngo-accent-light)',
		label: 'New Donation',
	},
	donation_expiring: {
		icon: <Clock size={16} />,
		accent: 'var(--color-ngo-urgent)',
		bg: 'var(--color-ngo-urgent-light)',
		label: 'Expiring Soon',
	},
	pickup_reminder: {
		icon: <QrCode size={16} />,
		accent: 'var(--color-ngo-warning)',
		bg: 'var(--color-ngo-warning-light)',
		label: 'Pickup Reminder',
	},
	ai_suggestion: {
		icon: <Cpu size={16} />,
		accent: '#8b5cf6',
		bg: '#f5f3ff',
		label: 'AI Suggestion',
	},
	pickup_confirmed: {
		icon: <CheckCircle2 size={16} />,
		accent: 'var(--color-ngo-accent)',
		bg: 'var(--color-ngo-accent-light)',
		label: 'Completed',
	},
	weather_alert: {
		icon: <CloudRain size={16} />,
		accent: '#0284c7',
		bg: '#e0f2fe',
		label: 'Weather Alert',
	},
}

function formatRelative(iso: string) {
	const diff = Date.now() - new Date(iso).getTime()
	const mins = Math.floor(diff / 60000)
	if (mins < 1) return 'Just now'
	if (mins < 60) return `${mins}m ago`
	const hours = Math.floor(mins / 60)
	if (hours < 24) return `${hours}h ago`
	return `${Math.floor(hours / 24)}d ago`
}

// ── Notification Card ─────────────────────────────────────────
function NotifCard({
	notif,
	onRead,
	onAction,
}: {
	notif: NGONotification
	onRead: (id: string) => void
	onAction: (url?: string) => void
}) {
	const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.new_donation

	return (
		<motion.div variants={slideUp} layout>
			<div
				className={cn(
					'rounded-[var(--radius-xl)] border p-4 transition-all cursor-pointer hover:shadow-md relative overflow-hidden',
					notif.isRead
						? 'bg-white border-[var(--color-ngo-border)]'
						: 'bg-[var(--color-ngo-surface-elevated)] border-[var(--color-ngo-border)]',
				)}
				onClick={() => {
					if (!notif.isRead) onRead(notif.id)
					if (notif.actionUrl) onAction(notif.actionUrl)
				}}
			>
				{/* Unread indicator */}
				{!notif.isRead && (
					<div
						className='absolute left-0 top-0 bottom-0 w-1 rounded-l-[var(--radius-xl)]'
						style={{ backgroundColor: cfg.accent }}
					/>
				)}

				<div className='flex gap-3 pl-1'>
					{/* Icon */}
					<div
						className='w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 mt-0.5'
						style={{ backgroundColor: cfg.bg, color: cfg.accent }}
					>
						{cfg.icon}
					</div>

					{/* Content */}
					<div className='flex-1 min-w-0'>
						<div className='flex items-start justify-between gap-2'>
							<p
								className={cn(
									'text-sm font-bold text-[var(--color-ngo-text-primary)] leading-snug',
									notif.isRead && 'font-medium text-[var(--color-ngo-text-secondary)]',
								)}
							>
								{notif.title}
							</p>
							<div className='flex items-center gap-1.5 flex-shrink-0'>
								{!notif.isRead && (
									<div
										className='w-2 h-2 rounded-full flex-shrink-0'
										style={{ backgroundColor: cfg.accent }}
									/>
								)}
								<span className='text-[10px] text-[var(--color-ngo-text-muted)]'>
									{formatRelative(notif.createdAt)}
								</span>
							</div>
						</div>
						<p className='text-xs text-[var(--color-ngo-text-muted)] mt-1 leading-relaxed line-clamp-2'>
							{notif.message}
						</p>
						<div className='flex items-center gap-2 mt-2'>
							<Badge
								className='text-[9px] font-bold border-none px-1.5 hover:opacity-90'
								style={{
									backgroundColor: cfg.bg,
									color: cfg.accent,
								}}
							>
								{cfg.label}
							</Badge>
							{notif.actionUrl && (
								<span className='text-[10px] font-semibold' style={{ color: cfg.accent }}>
									Tap to view →
								</span>
							)}
						</div>
					</div>
				</div>
			</div>
		</motion.div>
	)
}

// ── Main Page ──────────────────────────────────────────────────
export function NGONotificationsPage() {
	const navigate = useNavigate()
	const { notifications, unreadCount, markNotificationRead, markAllRead } = useNGOStore()

	const unread = notifications.filter((n) => !n.isRead)
	const read = notifications.filter((n) => n.isRead)

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Header ── */}
			<div className='sticky top-0 z-20 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] px-4 py-3'>
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
							Notifications
						</h1>
						{unreadCount > 0 && (
							<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>
								{unreadCount} unread
							</p>
						)}
					</div>
					{unreadCount > 0 && (
						<Button
							variant='outline'
							size='sm'
							onClick={markAllRead}
							className='h-8 text-xs border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] rounded-full gap-1.5'
						>
							<Check size={12} /> Mark all read
						</Button>
					)}
				</div>
			</div>

			<div className='flex-1 overflow-y-auto p-4 md:px-6'>
				<div className='max-w-2xl mx-auto space-y-6 pb-24'>
					{notifications.length === 0 ? (
						<div className='flex flex-col items-center justify-center h-[50vh] text-center'>
							<BellOff size={48} className='text-[var(--color-ngo-text-disabled)] mb-4' />
							<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
								All quiet here
							</h2>
							<p className='text-sm text-[var(--color-ngo-text-muted)] mt-1 max-w-xs'>
								Notifications about new donations, pickups, and AI suggestions will appear here.
							</p>
						</div>
					) : (
						<>
							{/* Unread */}
							{unread.length > 0 && (
								<div>
									<h2 className='text-xs font-bold text-[var(--color-ngo-text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2'>
										<Bell size={12} className='text-[var(--color-ngo-accent)]' /> New
									</h2>
									<motion.div
										variants={staggerContainer}
										initial='hidden'
										animate='visible'
										className='space-y-2'
									>
										<AnimatePresence>
											{unread.map((n) => (
												<NotifCard
													key={n.id}
													notif={n}
													onRead={markNotificationRead}
													onAction={(url) => url && navigate(url)}
												/>
											))}
										</AnimatePresence>
									</motion.div>
								</div>
							)}

							{/* Earlier */}
							{read.length > 0 && (
								<div>
									<h2 className='text-xs font-bold text-[var(--color-ngo-text-muted)] uppercase tracking-wider mb-3'>
										Earlier
									</h2>
									<motion.div
										variants={staggerContainer}
										initial='hidden'
										animate='visible'
										className='space-y-2'
									>
										{read.map((n) => (
											<NotifCard
												key={n.id}
												notif={n}
												onRead={markNotificationRead}
												onAction={(url) => url && navigate(url)}
											/>
										))}
									</motion.div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}
