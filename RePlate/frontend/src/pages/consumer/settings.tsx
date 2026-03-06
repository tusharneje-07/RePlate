import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { motion } from 'motion/react'
import {
	Bell,
	MapPin,
	Shield,
	Trash2,
	LogOut,
	ChevronRight,
	Moon,
	Globe,
	Leaf,
	Sprout,
	Utensils,
	Wheat,
	Milk,
	Flower2,
	Drumstick,
	Heart,
	AlertTriangle,
	Loader2,
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { profileApi } from '@/lib/api'
import type { DietaryTag } from '@/types'

// ── Toggle component ─────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
	return (
		<button
			type='button'
			role='switch'
			aria-checked={value}
			onClick={() => onChange(!value)}
			className={cn(
				'relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0',
				value ? 'bg-[var(--color-brand-accent)]' : 'bg-[var(--color-border)]',
			)}
		>
			<div className={cn(
				'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
				value ? 'translate-x-5' : 'translate-x-0',
			)} />
		</button>
	)
}

// ── Section component ────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'>
			<div className='px-4 py-3 border-b border-[var(--color-border-subtle)]'>
				<p className='text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider'>{title}</p>
			</div>
			{children}
		</div>
	)
}

const dietaryOptions: { id: DietaryTag; label: string; icon: LucideIcon }[] = [
	{ id: 'veg', label: 'Vegetarian', icon: Leaf },
	{ id: 'vegan', label: 'Vegan', icon: Sprout },
	{ id: 'non-veg', label: 'Non-Veg', icon: Drumstick },
	{ id: 'gluten-free', label: 'Gluten-Free', icon: Wheat },
	{ id: 'dairy-free', label: 'Dairy-Free', icon: Milk },
	{ id: 'jain', label: 'Jain', icon: Flower2 },
]

const allergenOptions = ['Gluten', 'Dairy', 'Eggs', 'Nuts', 'Soy', 'Shellfish']

export function SettingsPage() {
	const { logout } = useAuth()

	// Notification prefs (local only — no backend column yet)
	const [notifOrders, setNotifOrders] = useState(true)
	const [notifDeals, setNotifDeals] = useState(true)
	const [notifImpact, setNotifImpact] = useState(false)

	// Appearance (local only)
	const [darkMode, setDarkMode] = useState(false)
	const [language] = useState('English')

	// Dietary — loaded from + saved to backend
	const [dietary, setDietary] = useState<DietaryTag[]>([])
	// Allergens & radius (local only — no backend column yet)
	const [allergens, setAllergens] = useState<string[]>([])
	const [radius, setRadius] = useState(5000)

	const [isSaving, setIsSaving] = useState(false)
	const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')

	// Load existing profile preferences on mount
	useEffect(() => {
		profileApi
			.getConsumerProfile()
			.then(({ data }) => {
				if (data.dietary_preferences) {
					const tags = data.dietary_preferences
						.split(',')
						.map((s) => s.trim())
						.filter((s): s is DietaryTag => dietaryOptions.some((o) => o.id === s))
					setDietary(tags)
				}
			})
			.catch(() => {
				// silently ignore — user may not have a profile yet
			})
	}, [])

	function toggleDietary(tag: DietaryTag) {
		setDietary((prev) =>
			prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
		)
	}

	function toggleAllergen(a: string) {
		const lower = a.toLowerCase()
		setAllergens((prev) =>
			prev.includes(lower) ? prev.filter((x) => x !== lower) : [...prev, lower],
		)
	}

	async function handleSavePreferences() {
		setIsSaving(true)
		setSaveStatus('idle')
		try {
			await profileApi.updateConsumerProfile({
				dietary_preferences: dietary.length > 0 ? dietary.join(',') : null,
			})
			setSaveStatus('saved')
			// Auto-reset status label after 2.5 s
			setTimeout(() => setSaveStatus('idle'), 2500)
		} catch {
			setSaveStatus('error')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp}>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					Settings
				</h1>
				<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>Preferences & account</p>
			</motion.div>

			{/* Notifications */}
			<motion.div variants={slideUp}>
				<Section title='Notifications'>
					{[
						{ label: 'Order Updates', description: 'Ready for pickup, status changes', value: notifOrders, onChange: setNotifOrders },
						{ label: 'Flash Deals', description: 'New surplus listings near you', value: notifDeals, onChange: setNotifDeals },
						{ label: 'Impact Milestones', description: 'Streak, level-ups and eco stats', value: notifImpact, onChange: setNotifImpact },
					].map((item, i, arr) => (
						<div key={item.label}>
							<div className='flex items-center gap-3 px-4 py-3.5'>
								<Bell size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
								<div className='flex-1 min-w-0'>
									<p className='text-sm font-medium text-[var(--color-text-primary)]'>{item.label}</p>
									<p className='text-xs text-[var(--color-text-muted)]'>{item.description}</p>
								</div>
								<Toggle value={item.value} onChange={item.onChange} />
							</div>
							{i < arr.length - 1 && <Separator />}
						</div>
					))}
				</Section>
			</motion.div>

			{/* Food Preferences */}
			<motion.div variants={slideUp}>
				<Section title='Food Preferences'>
					{/* Dietary */}
					<div className='px-4 py-4'>
						<div className='flex items-center gap-2 mb-3'>
							<Utensils size={14} className='text-[var(--color-brand-accent)]' />
							<p className='text-sm font-medium text-[var(--color-text-primary)]'>Dietary Preferences</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							{dietaryOptions.map((opt) => {
								const isOn = dietary.includes(opt.id)
								return (
									<button
										key={opt.id}
										type='button'
										onClick={() => toggleDietary(opt.id)}
										className={cn(
											'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
											isOn
												? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)]'
												: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-accent-muted)]',
										)}
									>
										<opt.icon size={13} /> {opt.label}
									</button>
								)
							})}
						</div>
					</div>
					<Separator />

					{/* Allergens */}
					<div className='px-4 py-4'>
						<div className='flex items-center gap-2 mb-3'>
							<AlertTriangle size={14} className='text-[var(--color-warning)]' />
							<p className='text-sm font-medium text-[var(--color-text-primary)]'>Allergen Alerts</p>
						</div>
						<div className='flex flex-wrap gap-2'>
							{allergenOptions.map((a) => {
								const isOn = allergens.includes(a.toLowerCase())
								return (
									<button
										key={a}
										type='button'
										onClick={() => toggleAllergen(a)}
										className={cn(
											'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
											isOn
												? 'bg-[var(--color-warning)] text-white border-[var(--color-warning)]'
												: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-warning)]',
										)}
									>
										{a}
									</button>
								)
							})}
						</div>
					</div>
					<Separator />

					{/* Discovery radius */}
					<div className='px-4 py-4'>
						<div className='flex items-center justify-between mb-3'>
							<div className='flex items-center gap-2'>
								<MapPin size={14} className='text-[var(--color-brand-accent)]' />
								<p className='text-sm font-medium text-[var(--color-text-primary)]'>Discovery Radius</p>
							</div>
							<Badge variant='secondary' className='font-mono text-xs'>
								{(radius / 1000).toFixed(1)} km
							</Badge>
						</div>
						<input
							type='range'
							min={500}
							max={10000}
							step={500}
							value={radius}
							onChange={(e) => setRadius(Number(e.target.value))}
							className='w-full accent-[var(--color-brand-accent)] h-2 rounded-full bg-[var(--color-border-subtle)] cursor-pointer'
						/>
						<div className='flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1'>
							<span>0.5 km</span>
							<span>10 km</span>
						</div>
					</div>
				</Section>
			</motion.div>

			{/* Appearance */}
			<motion.div variants={slideUp}>
				<Section title='Appearance'>
					<div className='flex items-center gap-3 px-4 py-3.5'>
						<Moon size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
						<div className='flex-1'>
							<p className='text-sm font-medium text-[var(--color-text-primary)]'>Dark Mode</p>
							<p className='text-xs text-[var(--color-text-muted)]'>Coming soon</p>
						</div>
						<Toggle value={darkMode} onChange={setDarkMode} />
					</div>
					<Separator />
					<div className='flex items-center gap-3 px-4 py-3.5'>
						<Globe size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
						<div className='flex-1'>
							<p className='text-sm font-medium text-[var(--color-text-primary)]'>Language</p>
						</div>
						<div className='flex items-center gap-1.5'>
							<span className='text-sm text-[var(--color-text-muted)]'>{language}</span>
							<ChevronRight size={14} className='text-[var(--color-text-muted)]' />
						</div>
					</div>
				</Section>
			</motion.div>

			{/* Security */}
			<motion.div variants={slideUp}>
				<Section title='Account'>
					{[
						{ icon: Shield, label: 'Privacy & Security', description: 'Managed by WorkOS', action: () => {} },
					].map((item) => (
						<button
							key={item.label}
							type='button'
							onClick={item.action}
							className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors text-left'
						>
							<item.icon size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-[var(--color-text-primary)]'>{item.label}</p>
								<p className='text-xs text-[var(--color-text-muted)]'>{item.description}</p>
							</div>
							<ChevronRight size={14} className='text-[var(--color-text-muted)]' />
						</button>
					))}
				</Section>
			</motion.div>

			{/* Save preferences */}
			<motion.div variants={slideUp} className='space-y-1.5'>
				<Button size='lg' className='w-full' onClick={handleSavePreferences} disabled={isSaving}>
					{isSaving
						? <><Loader2 size={16} className='animate-spin mr-2' />Saving…</>
						: saveStatus === 'saved'
							? 'Preferences Saved ✓'
							: saveStatus === 'error'
								? 'Save Failed — Retry'
								: 'Save Preferences'
					}
				</Button>
				{saveStatus === 'error' && (
					<p className='text-xs text-center text-[var(--color-error)]'>
						Could not save preferences. Please try again.
					</p>
				)}
			</motion.div>

			{/* Danger zone */}
			<motion.div variants={slideUp}>
				<Section title='Danger Zone'>
					<div>
						<button
							type='button'
							className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-error-light)] transition-colors text-left'
						>
							<Trash2 size={15} className='text-[var(--color-error)] flex-shrink-0' />
							<div className='flex-1'>
								<p className='text-sm font-medium text-[var(--color-error)]'>Delete Account</p>
								<p className='text-xs text-[var(--color-text-muted)]'>Permanently remove your data</p>
							</div>
							<ChevronRight size={14} className='text-[var(--color-text-muted)]' />
						</button>
						<Separator />
						<button
							type='button'
							onClick={() => logout()}
							className='w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors text-left'
						>
							<LogOut size={15} className='text-[var(--color-text-muted)] flex-shrink-0' />
							<p className='text-sm font-medium text-[var(--color-text-secondary)]'>Sign Out</p>
							<ChevronRight size={14} className='text-[var(--color-text-muted)] ml-auto' />
						</button>
					</div>
				</Section>
			</motion.div>

			{/* App version */}
			<motion.div variants={slideUp} className='text-center'>
				<p className='text-xs text-[var(--color-text-muted)]'>RePlate Consumer v1.0.0 · Made with <Heart size={11} className='inline text-green-600' /></p>
			</motion.div>
		</motion.div>
	)
}
