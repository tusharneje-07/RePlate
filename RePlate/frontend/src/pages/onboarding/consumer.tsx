import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	ShoppingBag,
	MapPin,
	Bell,
	Sparkles,
	ChevronRight,
	ChevronLeft,
	CheckCircle2,
	Leaf,
	User,
	Loader2,
	LocateFixed,
	AlertCircle,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { profileApi } from '@/lib/api'
import { requestPosition } from '@/lib/geolocation'

// ── Fix Leaflet default icon paths (Vite bundler issue) ───────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

// ── Custom accent pin ────────────────────────────────────────────
const accentPin = L.divIcon({
	className: '',
	html: `<div style="width:32px;height:32px;background:#f86e0b;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)"></div>`,
	iconSize: [32, 32],
	iconAnchor: [16, 32],
})

// ── Nominatim reverse geocode ────────────────────────────────────
interface NominatimAddress {
	road?: string; suburb?: string; neighbourhood?: string
	city?: string; town?: string; village?: string; county?: string; postcode?: string
}
async function reverseGeocode(lat: number, lng: number) {
	const res = await fetch(
		`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
		{ headers: { 'Accept-Language': 'en', 'User-Agent': 'RePlate-App/1.0' } },
	)
	if (!res.ok) throw new Error('geocode failed')
	const data: { display_name: string; address: NominatimAddress } = await res.json()
	const a = data.address
	const road = a.road ?? a.neighbourhood ?? a.suburb ?? ''
	const suburb = a.suburb ?? a.neighbourhood ?? ''
	const city = a.city ?? a.town ?? a.village ?? a.county ?? ''
	const pincode = a.postcode ?? ''
	const parts = [road, suburb !== road ? suburb : '', city].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i)
	const address = parts.join(', ') || data.display_name
	return { lat, lng, address, city, pincode }
}

// ── Map sub-components ───────────────────────────────────────────
function ClickHandler({ position, onMove }: { position: { lat: number; lng: number }; onMove: (ll: { lat: number; lng: number }) => void }) {
	useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) })
	return (
		<Marker position={[position.lat, position.lng]} icon={accentPin} draggable
			eventHandlers={{ dragend: (e) => { const ll = (e.target as L.Marker).getLatLng(); onMove({ lat: ll.lat, lng: ll.lng }) } }}
		/>
	)
}
function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
	const map = useMap()
	const prev = useRef<{ lat: number; lng: number } | null>(null)
	useEffect(() => {
		if (target && target !== prev.current) { prev.current = target; map.flyTo([target.lat, target.lng], 16, { duration: 1.2 }) }
	}, [target, map])
	return null
}

// ── Types ─────────────────────────────────────────────────────
type DietaryTag = 'veg' | 'vegan' | 'non-veg' | 'gluten-free' | 'dairy-free' | 'jain'
type FoodCategory = 'bakery' | 'restaurant' | 'cafe' | 'grocery' | 'sweets' | 'meals' | 'snacks' | 'fruits'

interface ConsumerOnboardingForm {
	displayName: string
	city: string
	pincode: string
	lat: number | null
	lng: number | null
	dietary: DietaryTag[]
	categories: FoodCategory[]
	notificationsEnabled: boolean
	radius: number
}

// ── Step metadata ─────────────────────────────────────────────
const STEPS = [
	{ id: 1, label: 'Profile', icon: User },
	{ id: 2, label: 'Preferences', icon: ShoppingBag },
	{ id: 3, label: 'Location', icon: MapPin },
	{ id: 4, label: 'Done', icon: Sparkles },
]

// ── Option data ───────────────────────────────────────────────
const DIETARY_OPTIONS: { value: DietaryTag; label: string; emoji: string }[] = [
	{ value: 'veg', label: 'Vegetarian', emoji: '🥗' },
	{ value: 'vegan', label: 'Vegan', emoji: '🌱' },
	{ value: 'non-veg', label: 'Non-veg', emoji: '🍗' },
	{ value: 'gluten-free', label: 'Gluten-free', emoji: '🌾' },
	{ value: 'dairy-free', label: 'Dairy-free', emoji: '🥛' },
	{ value: 'jain', label: 'Jain', emoji: '🙏' },
]

const CATEGORY_OPTIONS: { value: FoodCategory; label: string; emoji: string }[] = [
	{ value: 'bakery', label: 'Bakery', emoji: '🥐' },
	{ value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
	{ value: 'cafe', label: 'Cafe', emoji: '☕' },
	{ value: 'grocery', label: 'Grocery', emoji: '🛒' },
	{ value: 'sweets', label: 'Sweets', emoji: '🍬' },
	{ value: 'meals', label: 'Meals', emoji: '🍱' },
	{ value: 'snacks', label: 'Snacks', emoji: '🍿' },
	{ value: 'fruits', label: 'Fruits', emoji: '🍎' },
]

const RADIUS_OPTIONS = [1, 2, 5, 10, 20]

// ── Field wrapper ─────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
	return (
		<div className='space-y-1.5'>
			<label className='text-sm font-medium text-[var(--color-text-primary)]'>{label}</label>
			{children}
			{hint && <p className='text-[11px] text-[var(--color-text-muted)]'>{hint}</p>}
		</div>
	)
}

function TextInput({
	value,
	onChange,
	placeholder,
	icon,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	icon?: React.ReactNode
}) {
	return (
		<div className='relative'>
			{icon && (
				<span className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]'>{icon}</span>
			)}
			<input
				type='text'
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					'w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white',
					'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]',
					'focus:outline-none focus:border-[var(--color-brand-accent)] focus:ring-1 focus:ring-[var(--color-brand-accent)]',
					'transition-colors',
					icon && 'pl-9',
				)}
			/>
		</div>
	)
}

// ── Step components ───────────────────────────────────────────
function Step1({ form, update }: { form: ConsumerOnboardingForm; update: (k: keyof ConsumerOnboardingForm, v: string) => void }) {
	return (
		<div className='space-y-5'>
			<div className='flex flex-col items-center gap-3 py-4'>
				<div className='w-20 h-20 rounded-full bg-[var(--color-brand-accent-muted)] border-2 border-dashed border-[var(--color-brand-accent)] flex items-center justify-center'>
					<User size={28} className='text-[var(--color-brand-accent)]' />
				</div>
				<p className='text-xs text-[var(--color-text-muted)]'>Your public display name</p>
			</div>

			<Field label='Display Name' hint='How should we address you in the app?'>
				<TextInput
					value={form.displayName}
					onChange={(v) => update('displayName', v)}
					placeholder='e.g. Priya'
					icon={<User size={15} />}
				/>
			</Field>
		</div>
	)
}

function Step2({
	form,
	toggleDietary,
	toggleCategory,
}: {
	form: ConsumerOnboardingForm
	toggleDietary: (t: DietaryTag) => void
	toggleCategory: (c: FoodCategory) => void
}) {
	return (
		<div className='space-y-6'>
			<Field label='Dietary preferences' hint='Select all that apply — we will personalise your feed'>
				<div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
					{DIETARY_OPTIONS.map((opt) => {
						const active = form.dietary.includes(opt.value)
						return (
							<button
								key={opt.value}
								onClick={() => toggleDietary(opt.value)}
								className={cn(
									'flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
									active
										? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]'
										: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)]',
								)}
							>
								<span className='text-base leading-none'>{opt.emoji}</span>
								{opt.label}
							</button>
						)
					})}
				</div>
			</Field>

			<Field label='Favourite categories' hint='What kind of food do you usually look for?'>
				<div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
					{CATEGORY_OPTIONS.map((opt) => {
						const active = form.categories.includes(opt.value)
						return (
							<button
								key={opt.value}
								onClick={() => toggleCategory(opt.value)}
								className={cn(
									'flex flex-col items-center gap-1 p-3 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
									active
										? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]'
										: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)]',
								)}
							>
								<span className='text-xl leading-none'>{opt.emoji}</span>
								{opt.label}
							</button>
						)
					})}
				</div>
			</Field>
		</div>
	)
}

function Step3({
	form,
	update,
	setRadius,
	onToggleNotifications,
	onLocationResolved,
}: {
	form: ConsumerOnboardingForm
	update: (k: keyof ConsumerOnboardingForm, v: string) => void
	setRadius: (r: number) => void
	onToggleNotifications: () => void
	onLocationResolved: (lat: number, lng: number, city: string, pincode: string) => void
}) {
	// Default: India center; will be overridden by GPS immediately
	const [pinPos, setPinPos] = useState({ lat: 20.5937, lng: 78.9629 })
	const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
	const [geocoding, setGeocoding] = useState(false)
	const [geocodeError, setGeocodeError] = useState(false)
	const [resolvedAddress, setResolvedAddress] = useState<string>('')
	const [locating, setLocating] = useState(false)
	const [geoError, setGeoError] = useState<string | null>(null)
	const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const scheduleGeocode = useCallback(
		(ll: { lat: number; lng: number }) => {
			if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
			setGeocoding(true)
			setGeocodeError(false)
			geocodeTimer.current = setTimeout(async () => {
				try {
					const loc = await reverseGeocode(ll.lat, ll.lng)
					setResolvedAddress(loc.address)
					onLocationResolved(loc.lat, loc.lng, loc.city, loc.pincode)
					update('city', loc.city)
					update('pincode', loc.pincode)
				} catch {
					setGeocodeError(true)
				} finally {
					setGeocoding(false)
				}
			}, 600)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onLocationResolved],
	)

	const handlePinMove = useCallback(
		(ll: { lat: number; lng: number }) => {
			setPinPos(ll)
			scheduleGeocode(ll)
		},
		[scheduleGeocode],
	)

	// Auto-request GPS on mount — checks permission state first.
	// If denied, shows actionable message. If prompt, the browser dialog appears.
	useEffect(() => {
		if (!navigator.geolocation) return
		setLocating(true)
		requestPosition().then((result) => {
			if (result.ok) {
				const ll = { lat: result.lat, lng: result.lng }
				setPinPos(ll)
				setFlyTarget(ll)
				scheduleGeocode(ll)
			} else if (result.message.includes('blocked')) {
				setGeoError(result.message)
			} else {
				setGeoError('Could not auto-detect location. Pin your location on the map.')
			}
			setLocating(false)
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	async function handleUseMyLocation() {
		if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return }
		setLocating(true)
		setGeoError(null)
		const result = await requestPosition()
		setLocating(false)
		if (result.ok) {
			const ll = { lat: result.lat, lng: result.lng }
			setPinPos(ll)
			setFlyTarget(ll)
			scheduleGeocode(ll)
		} else {
			setGeoError(result.message)
		}
	}

	return (
		<div className='space-y-4'>
			{/* ── Inline Leaflet map ── */}
			<div className='relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-border)] shadow-sm' style={{ height: 260 }}>
				<MapContainer
					center={[pinPos.lat, pinPos.lng]}
					zoom={5}
					style={{ height: '100%', width: '100%' }}
					zoomControl={false}
					attributionControl={false}
				>
					<TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
					<ClickHandler position={pinPos} onMove={handlePinMove} />
					<FlyTo target={flyTarget} />
				</MapContainer>

				{/* "Use my location" floating button */}
				<button
					type='button'
					onClick={handleUseMyLocation}
					disabled={locating}
					className={cn(
						'absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-lg transition-all',
						'bg-white text-[var(--color-brand-accent)] border border-[var(--color-brand-accent)]/30',
						'hover:bg-[var(--color-brand-accent)] hover:text-white hover:border-transparent',
						locating && 'opacity-60 pointer-events-none',
					)}
				>
					{locating ? <Loader2 size={13} className='animate-spin' /> : <LocateFixed size={13} />}
					{locating ? 'Locating…' : 'Use my location'}
				</button>

				{/* Locating overlay */}
				{locating && (
					<div className='absolute inset-0 z-[999] bg-white/40 backdrop-blur-[2px] flex items-center justify-center'>
						<div className='flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow text-sm font-medium text-[var(--color-brand-accent)]'>
							<Loader2 size={14} className='animate-spin' /> Detecting your location…
						</div>
					</div>
				)}
			</div>

			{/* Geo error */}
			{geoError && (
				<div className='flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-amber-50 border border-amber-200'>
					<AlertCircle size={14} className='text-amber-500 flex-shrink-0 mt-0.5' />
					<p className='text-xs text-amber-700'>{geoError}</p>
				</div>
			)}

			{/* Resolved address preview */}
			<div className='flex items-start gap-2.5 px-3 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]'>
				<MapPin size={14} className='text-[var(--color-brand-accent)] flex-shrink-0 mt-0.5' />
				<div className='flex-1 min-w-0'>
					{geocoding ? (
						<span className='text-xs text-[var(--color-text-muted)] flex items-center gap-1.5'>
							<Loader2 size={11} className='animate-spin' /> Finding address…
						</span>
					) : geocodeError ? (
						<span className='text-xs text-[var(--color-text-muted)]'>Could not resolve address. Pin it manually.</span>
					) : resolvedAddress ? (
						<>
							<p className='text-sm font-medium text-[var(--color-text-primary)] leading-snug'>{resolvedAddress}</p>
							{form.city && <p className='text-[11px] text-[var(--color-text-muted)] mt-0.5'>{form.city}{form.pincode ? ` – ${form.pincode}` : ''}</p>}
						</>
					) : (
						<span className='text-xs text-[var(--color-text-muted)]'>Tap the map or drag the pin to set your location</span>
					)}
				</div>
			</div>

			{/* City / Pincode — editable fallback */}
			<div className='grid grid-cols-2 gap-4'>
				<Field label='City'>
					<TextInput value={form.city} onChange={(v) => update('city', v)} placeholder='Auto-filled from map' icon={<MapPin size={15} />} />
				</Field>
				<Field label='PIN Code'>
					<TextInput value={form.pincode} onChange={(v) => update('pincode', v)} placeholder='Auto-filled from map' />
				</Field>
			</div>

			<Field label='Discovery radius' hint='How far are you willing to travel for pickup?'>
				<div className='flex gap-2 flex-wrap'>
					{RADIUS_OPTIONS.map((km) => (
						<button
							key={km}
							onClick={() => setRadius(km)}
							className={cn(
								'px-4 py-2 rounded-full text-sm font-medium border transition-all',
								form.radius === km
									? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)]'
									: 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)]',
							)}
						>
							{km} km
						</button>
					))}
				</div>
			</Field>

			<div className='flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-brand-accent-light)]'>
				<Bell size={16} className='text-[var(--color-brand-accent)] flex-shrink-0 mt-0.5' />
				<div className='flex-1'>
					<p className='text-sm font-medium text-[var(--color-text-primary)]'>Enable notifications</p>
					<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>Get alerts for deals near you and order updates.</p>
				</div>
				<button
					role='switch'
					aria-checked={form.notificationsEnabled}
					onClick={onToggleNotifications}
					className={cn(
						'w-11 h-6 rounded-full border-2 transition-all flex-shrink-0 relative',
						form.notificationsEnabled
							? 'bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)]'
							: 'bg-[var(--color-border)] border-[var(--color-border)]',
					)}
				>
					<span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all', form.notificationsEnabled ? 'left-[calc(100%-1.25rem)]' : 'left-0.5')} />
				</button>
			</div>
		</div>
	)
}

function Step4({ form }: { form: ConsumerOnboardingForm }) {
	const checks = [
		{ label: 'Display name set', done: !!form.displayName },
		{ label: 'Dietary preferences', done: form.dietary.length > 0 },
		{ label: 'Favourite categories', done: form.categories.length > 0 },
		{ label: 'Location set', done: !!form.city },
	]

	return (
		<div className='space-y-5'>
			{/* Welcome card */}
			<div className='rounded-[var(--radius-xl)] border border-[var(--color-border)] overflow-hidden bg-white'>
				<div className='h-20 bg-gradient-to-br from-[var(--color-brand-accent)] to-[#c94e00] flex items-center justify-center'>
					<ShoppingBag size={32} className='text-white' />
				</div>
				<div className='p-4 text-center'>
					<h2 className='font-[var(--font-display)] font-bold text-lg text-[var(--color-text-primary)]'>
						{form.displayName ? `Welcome, ${form.displayName}!` : 'You are all set!'}
					</h2>
					<p className='text-sm text-[var(--color-text-muted)] mt-1'>
						Start discovering discounted surplus food near you.
					</p>
				</div>
			</div>

			{/* Checklist */}
			<div className='space-y-2'>
				<p className='text-sm font-semibold text-[var(--color-text-primary)]'>Setup checklist</p>
				{checks.map((c) => (
					<div key={c.label} className='flex items-center gap-2.5'>
						<div
							className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
								c.done ? 'bg-[var(--color-success-light)]' : 'bg-[var(--color-border-subtle)]',
							)}
						>
							<CheckCircle2 size={13} className={c.done ? 'text-[var(--color-success)]' : 'text-[var(--color-text-disabled)]'} />
						</div>
						<span className={cn('text-sm', !c.done && 'text-[var(--color-text-muted)] line-through')}>
							{c.label}
						</span>
					</div>
				))}
			</div>

			{/* Eco teaser */}
			<div className='rounded-[var(--radius-lg)] bg-gradient-to-br from-[#1a3a28] to-[#2d5a3e] p-4 flex items-center gap-4'>
				<Leaf size={26} className='text-[#7ecfa0] flex-shrink-0' />
				<div>
					<p className='text-white font-semibold text-sm'>Every rescue counts</p>
					<p className='text-white/60 text-xs mt-0.5'>
						Our community has saved 48,000 kg of food this month.
					</p>
				</div>
			</div>
		</div>
	)
}

// ── Main component ────────────────────────────────────────────
export function ConsumerOnboardingPage() {
	const navigate = useNavigate()
	const { user, refreshUser } = useAuth()

	const [step, setStep] = useState(0)
	const [animDir, setAnimDir] = useState<1 | -1>(1)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [form, setForm] = useState<ConsumerOnboardingForm>({
		displayName: user?.firstName ?? '',
		city: '',
		pincode: '',
		lat: null,
		lng: null,
		dietary: [],
		categories: [],
		notificationsEnabled: true,
		radius: 5,
	})

	function update(key: keyof ConsumerOnboardingForm, value: string) {
		setForm((f) => ({ ...f, [key]: value }))
	}

	function toggleDietary(tag: DietaryTag) {
		setForm((f) => ({
			...f,
			dietary: f.dietary.includes(tag) ? f.dietary.filter((t) => t !== tag) : [...f.dietary, tag],
		}))
	}

	function toggleCategory(cat: FoodCategory) {
		setForm((f) => ({
			...f,
			categories: f.categories.includes(cat) ? f.categories.filter((c) => c !== cat) : [...f.categories, cat],
		}))
	}

	function setRadius(r: number) {
		setForm((f) => ({ ...f, radius: r }))
	}

	function handleLocationResolved(lat: number, lng: number, city: string, pincode: string) {
		setForm((f) => ({ ...f, lat, lng, city, pincode }))
	}

	function next() {
		setAnimDir(1)
		if (step < 3) setStep((s) => s + 1)
	}

	function prev() {
		setAnimDir(-1)
		if (step > 0) setStep((s) => s - 1)
	}

	async function finish() {
		setIsSubmitting(true)
		try {
			await profileApi.updateConsumerProfile({
				city: form.city || null,
				postal_code: form.pincode || null,
				country: 'IN',
				dietary_preferences: form.dietary.length > 0 ? form.dietary.join(',') : null,
			})
			// Re-fetch /auth/me so AuthContext has is_onboarded=true before we navigate.
			// Without this the OnboardingGuard still sees the stale false value and
			// bounces the user back to onboarding immediately after redirect.
			await refreshUser()
		} catch {
			// Non-blocking — proceed to dashboard even if profile update fails
		} finally {
			setIsSubmitting(false)
		}
		navigate('/consumer/dashboard', { replace: true })
	}

	const isLastStep = step === 3

	const variants = {
		enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
		center: { opacity: 1, x: 0 },
		exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
	}

	return (
		<div className='min-h-dvh bg-[var(--color-surface-elevated)] flex flex-col'>
			{/* ── Top bar ── */}
			<div className='sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--color-border)]'>
				<div className='max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3'>
					<div className='flex items-center gap-2'>
						<div className='w-7 h-7 rounded-full bg-[var(--color-brand-accent)] flex items-center justify-center'>
							<ShoppingBag size={14} className='text-white' />
						</div>
						<span className='text-sm font-semibold text-[var(--color-text-primary)] font-[var(--font-display)]'>
							RePlate Consumer
						</span>
					</div>
					<span className='text-xs text-[var(--color-text-muted)]'>Step {step + 1} of {STEPS.length}</span>
				</div>

				{/* Progress bar */}
				<div className='h-1 bg-[var(--color-border-subtle)]'>
					<motion.div
						className='h-full bg-[var(--color-brand-accent)] rounded-r-full'
						initial={false}
						animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
					/>
				</div>
			</div>

			{/* ── Step indicators ── */}
			<div className='max-w-xl mx-auto w-full px-4 pt-6 pb-2'>
				<div className='flex items-center gap-0'>
					{STEPS.map((s, i) => {
						const done = i < step
						const active = i === step
						const Icon = s.icon
						return (
							<div key={s.id} className='flex items-center flex-1 last:flex-none'>
								<div className='flex flex-col items-center gap-1'>
									<div
										className={cn(
											'w-9 h-9 rounded-full flex items-center justify-center transition-all border-2',
											done
												? 'bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)]'
												: active
													? 'bg-white border-[var(--color-brand-accent)] shadow-sm'
													: 'bg-white border-[var(--color-border)]',
										)}
									>
										{done ? (
											<CheckCircle2 size={16} className='text-white' />
										) : (
											<Icon size={16} className={active ? 'text-[var(--color-brand-accent)]' : 'text-[var(--color-text-disabled)]'} />
										)}
									</div>
									<span
										className={cn(
											'text-[10px] font-medium whitespace-nowrap',
											active ? 'text-[var(--color-brand-accent)]' : done ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-disabled)]',
										)}
									>
										{s.label}
									</span>
								</div>
								{i < STEPS.length - 1 && (
									<div
										className={cn(
											'flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all',
											i < step ? 'bg-[var(--color-brand-accent)]' : 'bg-[var(--color-border)]',
										)}
									/>
								)}
							</div>
						)
					})}
				</div>
			</div>

			{/* ── Step content ── */}
			<div className='flex-1 max-w-xl mx-auto w-full px-4 pb-4 overflow-hidden'>
				{/* Step title */}
				<div className='mb-5'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						{step === 0 && 'What should we call you?'}
						{step === 1 && 'Personalise your feed'}
						{step === 2 && 'Where are you located?'}
						{step === 3 && 'Ready to start saving!'}
					</h1>
					<p className='text-sm text-[var(--color-text-muted)] mt-1'>
						{step === 0 && 'Set up your consumer profile.'}
						{step === 1 && 'We will show you food that matches your tastes.'}
						{step === 2 && 'Find surplus food near you.'}
						{step === 3 && 'Review your preferences before exploring.'}
					</p>
				</div>

				<AnimatePresence mode='wait' custom={animDir}>
					<motion.div
						key={step}
						custom={animDir}
						variants={variants}
						initial='enter'
						animate='center'
						exit='exit'
						transition={{ duration: 0.22, ease: 'easeOut' }}
					>
						{step === 0 && <Step1 form={form} update={update} />}
						{step === 1 && <Step2 form={form} toggleDietary={toggleDietary} toggleCategory={toggleCategory} />}
						{step === 2 && <Step3 form={form} update={update} setRadius={setRadius} onToggleNotifications={() => setForm((f) => ({ ...f, notificationsEnabled: !f.notificationsEnabled }))} onLocationResolved={handleLocationResolved} />}
						{step === 3 && <Step4 form={form} />}
					</motion.div>
				</AnimatePresence>
			</div>

			{/* ── Footer navigation ── */}
			<div className='sticky bottom-0 bg-white border-t border-[var(--color-border)] px-4 py-3'>
				<div className='max-w-xl mx-auto flex items-center gap-3'>
					{step > 0 ? (
						<button
							onClick={prev}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)] transition-colors'
						>
							<ChevronLeft size={16} />
							Back
						</button>
					) : (
						<button
							onClick={() => navigate('/consumer/dashboard', { replace: true })}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-muted)] hover:border-[var(--color-brand-accent)] transition-colors'
						>
							Skip for now
						</button>
					)}

					<button
						onClick={isLastStep ? finish : next}
						disabled={isSubmitting}
						className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-accent-hover)] active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed'
					>
						{isLastStep ? (
							isSubmitting ? (
								<Loader2 size={16} className='animate-spin' />
							) : (
								<>
									<Sparkles size={16} />
									Explore food
								</>
							)
						) : (
							<>
								Continue
								<ChevronRight size={16} />
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
