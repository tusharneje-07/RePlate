import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { motion, AnimatePresence } from 'motion/react'
import {
	Store,
	Bell,
	CreditCard,
	Shield,
	ChevronRight,
	ToggleLeft,
	ToggleRight,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Smartphone,
	Mail,
	Volume2,
	Wallet,
	Building2,
	Trash2,
	LogOut,
	Info,
	ExternalLink,
	X,
	Loader2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, fadeIn, slideUp } from '@/lib/motion'
import { mockSellerProfile } from '@/data/seller-mock'
import { cn } from '@/lib/utils'

// ── Local state type ─────────────────────────────────────────
interface NotificationPrefs {
	newOrders: boolean
	orderCancelled: boolean
	pickupReminders: boolean
	listingExpiry: boolean
	lowStock: boolean
	newReviews: boolean
	paymentReceived: boolean
	marketingEmails: boolean
	smsAlerts: boolean
	pushNotifications: boolean
}

interface PayoutSettings {
	autoPayoutEnabled: boolean
	payoutSchedule: 'daily' | 'weekly' | 'monthly'
	minimumPayout: number
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
	return (
		<div className='flex items-start gap-3 mb-4'>
			<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-accent-light)] flex items-center justify-center flex-shrink-0'>
				<span className='text-[var(--color-seller-accent)]'>{icon}</span>
			</div>
			<div>
				<h2 className='text-base font-semibold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>{title}</h2>
				{description && <p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{description}</p>}
			</div>
		</div>
	)
}

// ── Toggle row ───────────────────────────────────────────────
function ToggleRow({
	label,
	description,
	value,
	onChange,
	icon,
}: {
	label: string
	description?: string
	value: boolean
	onChange: (v: boolean) => void
	icon?: React.ReactNode
}) {
	return (
		<div className='flex items-center justify-between gap-3 py-3'>
			<div className='flex items-center gap-3 min-w-0'>
				{icon && (
					<div className='w-7 h-7 rounded-full bg-[var(--color-seller-accent-muted)] flex items-center justify-center flex-shrink-0'>
						<span className='text-[var(--color-seller-accent)] [&>svg]:w-3.5 [&>svg]:h-3.5'>{icon}</span>
					</div>
				)}
				<div className='min-w-0'>
					<p className='text-sm font-medium text-[var(--color-seller-text-primary)] truncate'>{label}</p>
					{description && <p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{description}</p>}
				</div>
			</div>
			<button
				onClick={() => onChange(!value)}
				className='flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)] rounded-full'
				aria-checked={value}
				role='switch'
			>
				{value ? (
					<ToggleRight className='w-8 h-8 text-[var(--color-seller-accent)]' />
				) : (
					<ToggleLeft className='w-8 h-8 text-[var(--color-seller-text-disabled)]' />
				)}
			</button>
		</div>
	)
}

// ── Select row ───────────────────────────────────────────────
function SelectRow<T extends string>({
	label,
	description,
	value,
	options,
	onChange,
}: {
	label: string
	description?: string
	value: T
	options: { value: T; label: string }[]
	onChange: (v: T) => void
}) {
	return (
		<div className='flex items-center justify-between gap-3 py-3'>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-[var(--color-seller-text-primary)]'>{label}</p>
				{description && <p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{description}</p>}
			</div>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value as T)}
				className='text-sm font-medium bg-[var(--color-seller-accent-light)] text-[var(--color-seller-accent)] border border-[var(--color-seller-border)] rounded-[var(--radius-md)] px-2.5 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)] cursor-pointer'
			>
				{options.map((o) => (
					<option key={o.value} value={o.value}>
						{o.label}
					</option>
				))}
			</select>
		</div>
	)
}

// ── Nav row (link-style) ─────────────────────────────────────
function NavRow({ label, description, badge, onClick }: { label: string; description?: string; badge?: string; onClick?: () => void }) {
	return (
		<button
			onClick={onClick}
			className='flex items-center justify-between gap-3 py-3 w-full text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)] rounded-[var(--radius-sm)]'
		>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-[var(--color-seller-text-primary)] group-hover:text-[var(--color-seller-accent)] transition-colors'>{label}</p>
				{description && <p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>{description}</p>}
			</div>
			<div className='flex items-center gap-2 flex-shrink-0'>
				{badge && <Badge className='bg-[var(--color-seller-accent-muted)] text-[var(--color-seller-accent)] text-xs border-0 font-medium'>{badge}</Badge>}
				<ChevronRight className='w-4 h-4 text-[var(--color-seller-text-muted)] group-hover:text-[var(--color-seller-accent)] transition-colors' />
			</div>
		</button>
	)
}

// ── Danger button ────────────────────────────────────────────
function DangerButton({ label, description, icon, onClick }: { label: string; description?: string; icon: React.ReactNode; onClick?: () => void }) {
	return (
		<button
			onClick={onClick}
			className='flex items-center gap-3 w-full py-3 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded-[var(--radius-sm)]'
		>
			<div className='w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors'>
				<span className='text-red-500 [&>svg]:w-4 [&>svg]:h-4'>{icon}</span>
			</div>
			<div className='min-w-0'>
				<p className='text-sm font-medium text-red-600 group-hover:text-red-700 transition-colors'>{label}</p>
				{description && <p className='text-xs text-red-400 mt-0.5'>{description}</p>}
			</div>
		</button>
	)
}

// ── Info banner ──────────────────────────────────────────────
function InfoBanner({ children }: { children: React.ReactNode }) {
	return (
		<div className='flex items-start gap-2.5 bg-[var(--color-seller-accent-light)] border border-[var(--color-seller-border)] rounded-[var(--radius-md)] px-3.5 py-3 mb-4'>
			<Info className='w-4 h-4 text-[var(--color-seller-accent)] flex-shrink-0 mt-0.5' />
			<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>{children}</p>
		</div>
	)
}

// ── Main Component ───────────────────────────────────────────
export function SellerSettingsPage() {
	const profile = mockSellerProfile
	const { logout, deleteAccount } = useAuth()

	// Store open/closed toggle
	const [isStoreOpen, setIsStoreOpen] = useState(profile.isOpen)

	// Notification prefs
	const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
		newOrders: true,
		orderCancelled: true,
		pickupReminders: true,
		listingExpiry: true,
		lowStock: true,
		newReviews: true,
		paymentReceived: true,
		marketingEmails: false,
		smsAlerts: true,
		pushNotifications: true,
	})

	// Payout settings
	const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
		autoPayoutEnabled: true,
		payoutSchedule: 'weekly',
		minimumPayout: 200,
	})

	// Delete account dialog state
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deleteConfirmText, setDeleteConfirmText] = useState('')
	const [isDeleting, setIsDeleting] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	function updateNotif(key: keyof NotificationPrefs, value: boolean) {
		setNotifPrefs((prev) => ({ ...prev, [key]: value }))
	}

	function openDeleteDialog() {
		setDeleteConfirmText('')
		setDeleteError(null)
		setShowDeleteDialog(true)
	}

	async function handleDeleteAccount() {
		if (deleteConfirmText !== 'DELETE') return
		setIsDeleting(true)
		setDeleteError(null)
		try {
			await deleteAccount()
			// deleteAccount() navigates away — this line won't be reached
		} catch {
			setDeleteError('Failed to delete account. Please try again.')
			setIsDeleting(false)
		}
	}

	return (
		<>
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='max-w-2xl mx-auto px-4 pb-24 pt-2'
		>
			{/* Page title */}
			<motion.div variants={slideUp} className='mb-6'>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>Settings</h1>
				<p className='text-sm text-[var(--color-seller-text-muted)] mt-1'>Manage your store preferences and account</p>
			</motion.div>

			{/* ── Store Status ─────────────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<SectionHeader
							icon={<Store className='w-4 h-4' />}
							title='Store Status'
							description='Control whether your store is accepting orders right now'
						/>

						{/* Status card */}
						<div
							className={cn(
								'flex items-center justify-between gap-3 rounded-[var(--radius-lg)] p-4 mb-3 border transition-colors',
								isStoreOpen
									? 'bg-[var(--color-seller-eco-muted)] border-[var(--color-seller-eco-light)]'
									: 'bg-[var(--color-seller-border-subtle)] border-[var(--color-seller-border)]',
							)}
						>
							<div className='flex items-center gap-3'>
								<div
									className={cn(
										'w-3 h-3 rounded-full flex-shrink-0',
										isStoreOpen ? 'bg-[#2d8a4e] shadow-[0_0_0_4px_#c3e6cc]' : 'bg-[var(--color-seller-text-disabled)]',
									)}
								/>
								<div>
									<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
										{isStoreOpen ? 'Open for Orders' : 'Closed'}
									</p>
									<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
										{isStoreOpen
											? `Accepting orders until ${profile.closeTime}`
											: 'Customers cannot place orders right now'}
									</p>
								</div>
							</div>
							<button
								onClick={() => setIsStoreOpen((v) => !v)}
								className='focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-seller-accent)] rounded-full'
								aria-checked={isStoreOpen}
								role='switch'
							>
								{isStoreOpen ? (
									<ToggleRight className='w-9 h-9 text-[#2d8a4e]' />
								) : (
									<ToggleLeft className='w-9 h-9 text-[var(--color-seller-text-disabled)]' />
								)}
							</button>
						</div>

						{/* Opening hours info */}
						<div className='flex items-center gap-2 text-xs text-[var(--color-seller-text-muted)]'>
							<Clock className='w-3.5 h-3.5 flex-shrink-0' />
							<span>
								Regular hours: {profile.openTime} – {profile.closeTime}
							</span>
							<span className='mx-1'>·</span>
							<span>Closed: {profile.closedDays.length > 0 ? profile.closedDays.join(', ') : 'No closed days'}</span>
						</div>

						<Separator className='bg-[var(--color-seller-border-subtle)] my-3' />

						{/* Quick actions */}
						<NavRow
							label='Edit Store Hours'
							description='Change regular opening and closing times'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Holiday / Closure Schedule'
							description='Set upcoming dates when your store will be closed'
							onClick={() => {}}
						/>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Notifications ────────────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<SectionHeader
							icon={<Bell className='w-4 h-4' />}
							title='Notifications'
							description='Choose what you want to be notified about'
						/>

						{/* Channels */}
						<p className='text-xs font-semibold uppercase tracking-wider text-[var(--color-seller-text-muted)] mb-1'>Delivery channels</p>
						<ToggleRow
							label='Push Notifications'
							description='Real-time alerts on your device'
							value={notifPrefs.pushNotifications}
							onChange={(v) => updateNotif('pushNotifications', v)}
							icon={<Smartphone />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='SMS Alerts'
							description='Text messages for critical events'
							value={notifPrefs.smsAlerts}
							onChange={(v) => updateNotif('smsAlerts', v)}
							icon={<Smartphone />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Marketing Emails'
							description='Tips, promotions and platform updates'
							value={notifPrefs.marketingEmails}
							onChange={(v) => updateNotif('marketingEmails', v)}
							icon={<Mail />}
						/>

						<Separator className='bg-[var(--color-seller-border)] my-3' />

						{/* Events */}
						<p className='text-xs font-semibold uppercase tracking-wider text-[var(--color-seller-text-muted)] mb-1'>Event alerts</p>
						<ToggleRow
							label='New Orders'
							value={notifPrefs.newOrders}
							onChange={(v) => updateNotif('newOrders', v)}
							icon={<Bell />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Order Cancellations'
							value={notifPrefs.orderCancelled}
							onChange={(v) => updateNotif('orderCancelled', v)}
							icon={<Bell />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Pickup Reminders'
							description='Alert when a pickup window is about to close'
							value={notifPrefs.pickupReminders}
							onChange={(v) => updateNotif('pickupReminders', v)}
							icon={<Clock />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Listing Expiry Warnings'
							description='Remind me before a listing expires'
							value={notifPrefs.listingExpiry}
							onChange={(v) => updateNotif('listingExpiry', v)}
							icon={<Bell />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Low Stock Alerts'
							value={notifPrefs.lowStock}
							onChange={(v) => updateNotif('lowStock', v)}
							icon={<Volume2 />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='New Reviews'
							value={notifPrefs.newReviews}
							onChange={(v) => updateNotif('newReviews', v)}
							icon={<Bell />}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<ToggleRow
							label='Payment Received'
							value={notifPrefs.paymentReceived}
							onChange={(v) => updateNotif('paymentReceived', v)}
							icon={<Wallet />}
						/>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Payouts ──────────────────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<SectionHeader
							icon={<CreditCard className='w-4 h-4' />}
							title='Payouts & Billing'
							description='Manage how and when you get paid'
						/>

						{/* Bank account linked status */}
						<div className='flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] p-3 mb-4 bg-[var(--color-seller-bg)]'>
							<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-seller-accent-muted)] flex items-center justify-center flex-shrink-0'>
								<Building2 className='w-4 h-4 text-[var(--color-seller-accent)]' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Bank Account</p>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5 truncate'>
									{profile.bankAccountLinked ? 'HDFC Bank ·· 4521 (linked)' : 'No bank account linked'}
								</p>
							</div>
							{profile.bankAccountLinked ? (
								<CheckCircle2 className='w-5 h-5 text-[#2d8a4e] flex-shrink-0' />
							) : (
								<Badge className='bg-red-50 text-red-500 border-0 text-xs'>Action needed</Badge>
							)}
						</div>

						<ToggleRow
							label='Auto Payout'
							description='Automatically transfer earnings on schedule'
							value={payoutSettings.autoPayoutEnabled}
							onChange={(v) => setPayoutSettings((p) => ({ ...p, autoPayoutEnabled: v }))}
							icon={<Wallet />}
						/>

						{payoutSettings.autoPayoutEnabled && (
							<>
								<Separator className='bg-[var(--color-seller-border-subtle)]' />
								<SelectRow
									label='Payout Schedule'
									description='How often should earnings be transferred?'
									value={payoutSettings.payoutSchedule}
									options={[
										{ value: 'daily', label: 'Daily' },
										{ value: 'weekly', label: 'Weekly' },
										{ value: 'monthly', label: 'Monthly' },
									]}
									onChange={(v) => setPayoutSettings((p) => ({ ...p, payoutSchedule: v }))}
								/>
							</>
						)}

						<Separator className='bg-[var(--color-seller-border)] my-3' />

						<NavRow
							label='Transaction History'
							description='View all past payouts and fees'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Change Bank Account'
							description='Update your payout bank details'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Tax & GST Settings'
							description='Configure tax info for invoicing'
							onClick={() => {}}
						/>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Security & Account ───────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<SectionHeader
							icon={<Shield className='w-4 h-4' />}
							title='Security & Account'
						/>

						{/* Verification status */}
						<div
							className={cn(
								'flex items-center gap-3 rounded-[var(--radius-md)] border p-3 mb-4',
								profile.verificationStatus === 'verified'
									? 'bg-[var(--color-seller-eco-muted)] border-[var(--color-seller-eco-light)]'
									: 'bg-amber-50 border-amber-200',
							)}
						>
							{profile.verificationStatus === 'verified' ? (
								<CheckCircle2 className='w-5 h-5 text-[#2d8a4e] flex-shrink-0' />
							) : (
								<AlertTriangle className='w-5 h-5 text-amber-500 flex-shrink-0' />
							)}
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
									{profile.verificationStatus === 'verified' ? 'Account Verified' : 'Verification Pending'}
								</p>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
									{profile.verificationStatus === 'verified'
										? 'Your FSSAI and GST documents are verified'
										: 'Submit your documents to get a verified badge'}
								</p>
							</div>
						</div>

						<NavRow
							label='Change Password'
							description='Update your login credentials'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Two-Factor Authentication'
							description='Add an extra layer of login security'
							badge='Recommended'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Linked Devices'
							description='View and revoke active sessions'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Compliance Documents'
							description='FSSAI license, GST certificate uploads'
							onClick={() => {}}
						/>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Help & Support ───────────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<SectionHeader
							icon={<Info className='w-4 h-4' />}
							title='Help & Support'
						/>

						<NavRow label='Seller Help Center' description='FAQs and guides for sellers' onClick={() => {}} />
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow label='Contact Support' description='Chat or email with our team' onClick={() => {}} />
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<NavRow
							label='Platform Terms & Policies'
							description='Seller agreement and usage policies'
							onClick={() => {}}
						/>
						<Separator className='bg-[var(--color-seller-border-subtle)]' />
						<button className='flex items-center gap-2 py-3 text-sm font-medium text-[var(--color-seller-text-secondary)] hover:text-[var(--color-seller-accent)] transition-colors group w-full'>
							<ExternalLink className='w-4 h-4 group-hover:text-[var(--color-seller-accent)] transition-colors' />
							Open Seller Portal
						</button>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Danger Zone ──────────────────────────────────────── */}
			<motion.div variants={fadeIn}>
				<Card className='border-red-100 bg-[var(--color-seller-surface-card)] shadow-none mb-4 overflow-hidden'>
					<CardContent className='p-4'>
						<div className='flex items-start gap-3 mb-4'>
							<div className='w-9 h-9 rounded-[var(--radius-md)] bg-red-50 flex items-center justify-center flex-shrink-0'>
								<AlertTriangle className='w-4 h-4 text-red-500' />
							</div>
							<div>
								<h2 className='text-base font-semibold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
									Danger Zone
								</h2>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
									These actions are irreversible. Proceed with caution.
								</p>
							</div>
						</div>

						<InfoBanner>
							Deactivating or deleting your store will remove all your listings from the marketplace. Active orders will
							still be processed to completion before any changes take effect.
						</InfoBanner>

						<DangerButton
							label='Sign Out'
							description='Sign out of your seller account on this device'
							icon={<LogOut />}
							onClick={() => logout()}
						/>
						<Separator className='bg-red-50 my-1' />
						<DangerButton
							label='Deactivate Store'
							description='Temporarily hide your store from the marketplace'
							icon={<Store />}
							onClick={() => {}}
						/>
						<Separator className='bg-red-50 my-1' />
					<DangerButton
						label='Delete Account'
						description='Permanently delete your store and all data'
						icon={<Trash2 />}
						onClick={openDeleteDialog}
					/>
				</CardContent>
			</Card>
		</motion.div>

		{/* Footer version */}
		<motion.p
			variants={fadeIn}
			className='text-center text-xs text-[var(--color-seller-text-disabled)] pb-4'
		>
			RePlate Seller · v1.0.0 · Built with care for the planet
		</motion.p>
	</motion.div>

	{/* ── Delete Account Confirmation Dialog ───────────────────── */}
	<AnimatePresence>
		{showDeleteDialog && (
			<motion.div
				key='delete-backdrop'
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.18 }}
				className='fixed inset-0 z-[9999] flex items-center justify-center px-4'
				style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
			>
				<motion.div
					key='delete-dialog'
					initial={{ scale: 0.93, opacity: 0, y: 16 }}
					animate={{ scale: 1, opacity: 1, y: 0 }}
					exit={{ scale: 0.93, opacity: 0, y: 16 }}
					transition={{ type: 'spring', damping: 26, stiffness: 340 }}
					className='w-full max-w-sm bg-white rounded-[var(--radius-xl)] shadow-2xl overflow-hidden'
				>
					{/* Dialog header */}
					<div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-red-100'>
						<div className='flex items-center gap-2.5'>
							<div className='w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0'>
								<AlertTriangle size={17} className='text-red-600' />
							</div>
							<div>
								<p className='text-sm font-bold text-[var(--color-seller-text-primary)]'>Delete Account</p>
								<p className='text-[11px] text-red-500'>This action is permanent and irreversible</p>
							</div>
						</div>
						<button
							type='button'
							onClick={() => setShowDeleteDialog(false)}
							disabled={isDeleting}
							className='w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-seller-text-muted)] hover:bg-[var(--color-seller-bg)] transition-colors'
						>
							<X size={15} />
						</button>
					</div>

					{/* Dialog body */}
					<div className='px-5 py-4 space-y-4'>
						<div className='space-y-2 text-sm text-[var(--color-seller-text-secondary)] leading-relaxed'>
							<p>The following will be <strong className='text-red-600'>permanently deleted</strong>:</p>
							<ul className='space-y-1 pl-4 text-xs'>
								{[
									'Store profile and all store data',
									'All food listings',
									'All orders (seller side)',
									'Compliance documents (FSSAI, GST)',
									'Bank account details',
									'Your WorkOS identity',
								].map((item) => (
									<li key={item} className='flex items-center gap-2 text-red-600'>
										<span className='w-1 h-1 rounded-full bg-red-400 flex-shrink-0' />
										{item}
									</li>
								))}
							</ul>
						</div>

						<div className='space-y-1.5'>
							<label className='text-xs font-semibold text-[var(--color-seller-text-primary)]'>
								Type <span className='font-mono text-red-600 bg-red-50 px-1 rounded'>DELETE</span> to confirm
							</label>
							<input
								type='text'
								value={deleteConfirmText}
								onChange={(e) => setDeleteConfirmText(e.target.value)}
								placeholder='DELETE'
								disabled={isDeleting}
								className='w-full h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--color-seller-border)] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors disabled:opacity-60'
							/>
						</div>

						{deleteError && (
							<motion.div
								initial={{ opacity: 0, y: -4 }}
								animate={{ opacity: 1, y: 0 }}
								className='flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-red-50 border border-red-200'
							>
								<AlertTriangle size={13} className='text-red-500 flex-shrink-0 mt-0.5' />
								<p className='text-xs text-red-700'>{deleteError}</p>
							</motion.div>
						)}
					</div>

					{/* Dialog footer */}
					<div className='px-5 pb-5 flex gap-2'>
						<button
							type='button'
							onClick={() => setShowDeleteDialog(false)}
							disabled={isDeleting}
							className='flex-1 h-9 px-3 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] text-sm font-medium text-[var(--color-seller-text-primary)] hover:bg-[var(--color-seller-bg)] transition-colors disabled:opacity-50'
						>
							Cancel
						</button>
						<button
							type='button'
							onClick={handleDeleteAccount}
							disabled={deleteConfirmText !== 'DELETE' || isDeleting}
							className='flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-full)] bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
						>
							{isDeleting ? (
								<Loader2 size={14} className='animate-spin' />
							) : (
								<>
									<Trash2 size={13} />
									Delete Forever
								</>
							)}
						</button>
					</div>
				</motion.div>
			</motion.div>
		)}
	</AnimatePresence>
</>
)
}
