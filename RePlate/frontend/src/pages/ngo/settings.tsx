import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'motion/react'
import {
	Bell,
	MapPin,
	Truck,
	Shield,
	Moon,
	Globe,
	LogOut,
	ChevronRight,
	ToggleLeft,
	Package,
	Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp } from '@/lib/motion'
import { useNGOStore } from '@/stores/ngo-store'

// ── Toggle Row ──────────────────────────────────────────────────
function ToggleRow({
	label,
	description,
	value,
	onChange,
}: {
	label: string
	description?: string
	value: boolean
	onChange: (v: boolean) => void
}) {
	return (
		<div className='flex items-center justify-between py-3 border-b border-[var(--color-ngo-border-subtle)] last:border-0'>
			<div className='flex-1 pr-4'>
				<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>{label}</p>
				{description && (
					<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>{description}</p>
				)}
			</div>
			<button
				onClick={() => onChange(!value)}
				className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
					value ? 'bg-[var(--color-ngo-accent)]' : 'bg-[var(--color-ngo-border)]'
				}`}
			>
				<span
					className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
						value ? 'translate-x-5' : 'translate-x-0'
					}`}
				/>
			</button>
		</div>
	)
}

// ── Nav Row ────────────────────────────────────────────────────
function NavRow({
	icon,
	label,
	description,
	onClick,
	danger,
}: {
	icon: React.ReactNode
	label: string
	description?: string
	onClick?: () => void
	danger?: boolean
}) {
	return (
		<button
			onClick={onClick}
			className='w-full flex items-center gap-3 py-3 text-left border-b border-[var(--color-ngo-border-subtle)] last:border-0 hover:bg-[var(--color-ngo-surface-elevated)] -mx-1 px-1 rounded-[var(--radius-md)] transition-colors'
		>
			<div
				className={`w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center flex-shrink-0 ${
					danger
						? 'bg-red-50 text-red-500'
						: 'bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)]'
				}`}
			>
				{icon}
			</div>
			<div className='flex-1'>
				<p
					className={`text-sm font-semibold ${
						danger ? 'text-red-500' : 'text-[var(--color-ngo-text-primary)]'
					}`}
				>
					{label}
				</p>
				{description && (
					<p className='text-xs text-[var(--color-ngo-text-muted)]'>{description}</p>
				)}
			</div>
			<ChevronRight size={16} className='text-[var(--color-ngo-text-disabled)] flex-shrink-0' />
		</button>
	)
}

// ── Section wrapper ─────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
			<h3 className='text-xs font-bold text-[var(--color-ngo-text-muted)] uppercase tracking-wider mb-2'>
				{title}
			</h3>
			{children}
		</motion.div>
	)
}

// ── Main Page ──────────────────────────────────────────────────
export function NGOSettingsPage() {
	const { profile } = useNGOStore()
	const { logout } = useAuth()

	// Notification prefs (local state — would sync to backend in production)
	const [notifNew, setNotifNew] = useState(true)
	const [notifExpiring, setNotifExpiring] = useState(true)
	const [notifReminder, setNotifReminder] = useState(true)
	const [notifAI, setNotifAI] = useState(true)
	const [notifWeather, setNotifWeather] = useState(false)

	// Ops prefs
	const [autoAccept, setAutoAccept] = useState(false)
	const [aiSuggestions, setAiSuggestions] = useState(true)
	const [routeOptimization, setRouteOptimization] = useState(true)

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Header ── */}
			<div className='sticky top-0 z-20 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] px-4 py-3'>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
					Settings
				</h1>
				<p className='text-xs text-[var(--color-ngo-text-muted)] mt-0.5'>
					Preferences for {profile?.organizationName}
				</p>
			</div>

			<div className='flex-1 overflow-y-auto p-4 md:px-6'>
				<motion.div
					variants={staggerContainer}
					initial='hidden'
					animate='visible'
					className='max-w-2xl mx-auto space-y-4 pb-24'
				>
					{/* ── Notifications ── */}
					<Section title='Notifications'>
						<ToggleRow
							label='New Donations'
							description='Alert when a donation is listed nearby'
							value={notifNew}
							onChange={setNotifNew}
						/>
						<ToggleRow
							label='Expiry Alerts'
							description='Warn when a claimed donation is about to expire'
							value={notifExpiring}
							onChange={setNotifExpiring}
						/>
						<ToggleRow
							label='Pickup Reminders'
							description='Remind 1 hour before a scheduled pickup'
							value={notifReminder}
							onChange={setNotifReminder}
						/>
						<ToggleRow
							label='AI Suggestions'
							description='Cluster and route optimization tips from AI'
							value={notifAI}
							onChange={setNotifAI}
						/>
						<ToggleRow
							label='Weather Alerts'
							description='Rain and extreme weather warnings'
							value={notifWeather}
							onChange={setNotifWeather}
						/>
					</Section>

					{/* ── Operations ── */}
					<Section title='Operations'>
						<ToggleRow
							label='AI Suggestions'
							description='Show AI pickup clustering on dashboard'
							value={aiSuggestions}
							onChange={setAiSuggestions}
						/>
						<ToggleRow
							label='Route Optimization'
							description='Auto-suggest optimal pickup order'
							value={routeOptimization}
							onChange={setRouteOptimization}
						/>
						<ToggleRow
							label='Auto-Accept Low-Urgency'
							description='Automatically claim low-urgency donations in your area'
							value={autoAccept}
							onChange={setAutoAccept}
						/>
					</Section>

					{/* ── Account ── */}
					<Section title='Account'>
						<NavRow
							icon={<MapPin size={14} />}
							label='Service Areas'
							description='Manage zones where you accept pickups'
						/>
						<NavRow
							icon={<Clock size={14} />}
							label='Operating Hours'
							description={`${profile?.operatingHours.open} – ${profile?.operatingHours.close}`}
						/>
						<NavRow
							icon={<Truck size={14} />}
							label='Vehicle & Capacity'
							description={`${profile?.vehicleType} · ${profile?.pickupCapacityKg} kg/day`}
						/>
						<NavRow
							icon={<Package size={14} />}
							label='Food Category Preferences'
							description='Filter donations by food type'
						/>
					</Section>

					{/* ── Privacy ── */}
					<Section title='Privacy & Security'>
						<NavRow
							icon={<Shield size={14} />}
							label='Data & Privacy'
							description='Manage how your data is used'
						/>
						<NavRow
							icon={<Globe size={14} />}
							label='Public Profile Visibility'
							description='Control what donors can see'
						/>
					</Section>

					{/* ── Danger zone ── */}
					<Section title='Session'>
						<NavRow
							icon={<LogOut size={14} />}
							label='Sign Out'
							description='Sign out of this device'
							danger
							onClick={() => logout()}
						/>
					</Section>

					{/* Version */}
					<p className='text-center text-xs text-[var(--color-ngo-text-disabled)] pb-2'>
						RePlate NGO Module · v0.1.0-beta
					</p>
				</motion.div>
			</div>
		</div>
	)
}
