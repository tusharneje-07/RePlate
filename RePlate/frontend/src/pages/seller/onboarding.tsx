import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	Store,
	MapPin,
	Clock,
	FileText,
	CheckCircle2,
	ChevronRight,
	ChevronLeft,
	Upload,
	Camera,
	Phone,
	Mail,
	Building2,
	Leaf,
	Sparkles,
	AlertCircle,
	Loader2,
	LocateFixed,
	X,
	Croissant,
	UtensilsCrossed,
	Coffee,
	ShoppingCart,
	CandyOff,
	Package,
	Utensils,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { cn } from '@/lib/utils'
import { useSellerUIStore } from '@/stores/seller-ui-store'
import { profileApi, uploadFile } from '@/lib/api'
import { requestPosition } from '@/lib/geolocation'
import { useAuth } from '@/hooks/useAuth'

// ── Fix Leaflet default icon paths (Vite bundler issue) ────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow })

// ── Custom store pin (seller brand colour) ──────────────────────────
const storePin = L.divIcon({
	className: '',
	html: `<div style="width:32px;height:32px;background:#92400e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.35)"></div>`,
	iconSize: [32, 32],
	iconAnchor: [16, 32],
})

// ── Nominatim reverse geocode ───────────────────────────────────────
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
	const city = a.city ?? a.town ?? a.village ?? a.county ?? ''
	const pincode = a.postcode ?? ''
	return { lat, lng, city, pincode }
}

// ── Map sub-components ──────────────────────────────────────────────
function ClickHandler({ position, onMove }: { position: { lat: number; lng: number }; onMove: (ll: { lat: number; lng: number }) => void }) {
	useMapEvents({ click: (e) => onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) })
	return (
		<Marker position={[position.lat, position.lng]} icon={storePin} draggable
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

// ── Types ────────────────────────────────────────────────────
interface OnboardingForm {
	// Step 1 — Store identity
	storeName: string
	ownerName: string
	email: string
	phone: string
	category: string
	description: string
	logoUrl: string | null   // uploaded URL
	// Step 2 — Location & hours
	lat: number | null
	lng: number | null
	address: string
	city: string
	pincode: string
	openTime: string
	closeTime: string
	closedDays: string[]
	// Step 3 — Documents
	fssaiLicense: string
	fssaiCertUrl: string | null   // uploaded URL
	gstNumber: string
	bankAccount: string
	ifsc: string
	bankStatementUrl: string | null  // uploaded URL
	// Step 4 — Preview (no inputs)
}

const CATEGORIES: { value: string; label: string; icon: React.ReactNode }[] = [
	{ value: 'bakery', label: 'Bakery', icon: <Croissant size={18} /> },
	{ value: 'restaurant', label: 'Restaurant', icon: <UtensilsCrossed size={18} /> },
	{ value: 'cafe', label: 'Cafe', icon: <Coffee size={18} /> },
	{ value: 'grocery', label: 'Grocery', icon: <ShoppingCart size={18} /> },
	{ value: 'sweets', label: 'Sweets', icon: <CandyOff size={18} /> },
	{ value: 'cloud_kitchen', label: 'Cloud Kitchen', icon: <Package size={18} /> },
	{ value: 'catering', label: 'Catering', icon: <Utensils size={18} /> },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const STEPS = [
	{ id: 1, label: 'Store Info', icon: Store },
	{ id: 2, label: 'Location', icon: MapPin },
	{ id: 3, label: 'Documents', icon: FileText },
	{ id: 4, label: 'Go Live', icon: Sparkles },
]

// ── Field component ──────────────────────────────────────────
function Field({
	label,
	required,
	hint,
	children,
}: {
	label: string
	required?: boolean
	hint?: string
	children: React.ReactNode
}) {
	return (
		<div className='space-y-1.5'>
			<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>
				{label}
				{required && <span className='text-red-500 ml-0.5'>*</span>}
			</label>
			{children}
			{hint && <p className='text-[11px] text-[var(--color-seller-text-muted)]'>{hint}</p>}
		</div>
	)
}

function TextInput({
	value,
	onChange,
	placeholder,
	type = 'text',
	icon,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	type?: string
	icon?: React.ReactNode
}) {
	return (
		<div className='relative'>
			{icon && (
				<span className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)]'>{icon}</span>
			)}
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					'w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white',
					'text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-disabled)]',
					'focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]',
					'transition-colors',
					icon && 'pl-9',
				)}
			/>
		</div>
	)
}

function TextArea({
	value,
	onChange,
	placeholder,
	rows = 3,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	rows?: number
}) {
	return (
		<textarea
			rows={rows}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-disabled)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)] transition-colors resize-none'
		/>
	)
}

// ── Upload dropzone ───────────────────────────────────────────
function UploadDropzone({
	label,
	accept,
	currentUrl,
	onUploaded,
}: {
	label: string
	accept: string
	currentUrl: string | null
	onUploaded: (url: string) => void
}) {
	const [uploading, setUploading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)

	async function handleFile(file: File) {
		setUploading(true)
		setError(null)
		try {
			const url = await uploadFile(file)
			onUploaded(url)
		} catch {
			setError('Upload failed. Please try again.')
		} finally {
			setUploading(false)
		}
	}

	return (
		<div>
			<input
				ref={inputRef}
				type='file'
				accept={accept}
				className='hidden'
				onChange={(e) => {
					const file = e.target.files?.[0]
					if (file) handleFile(file)
					// Reset so same file can be re-selected
					e.target.value = ''
				}}
			/>
			<div
				onClick={() => !uploading && inputRef.current?.click()}
				className={cn(
					'border-2 border-dashed rounded-[var(--radius-md)] p-4 flex flex-col items-center gap-2',
					'transition-colors cursor-pointer group',
					currentUrl
						? 'border-[var(--color-seller-accent)] bg-[var(--color-seller-accent-light)]'
						: 'border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-light)]',
					uploading && 'opacity-60 pointer-events-none',
				)}
			>
				{uploading ? (
					<Loader2 size={20} className='text-[var(--color-seller-accent)] animate-spin' />
				) : currentUrl ? (
					<CheckCircle2 size={20} className='text-[var(--color-seller-accent)]' />
				) : (
					<Upload size={20} className='text-[var(--color-seller-text-muted)] group-hover:text-[var(--color-seller-accent)]' />
				)}
				<p className={cn(
					'text-xs',
					currentUrl ? 'text-[var(--color-seller-accent)] font-medium' : 'text-[var(--color-seller-text-muted)] group-hover:text-[var(--color-seller-text-secondary)]',
				)}>
					{uploading ? 'Uploading…' : currentUrl ? 'Uploaded — click to replace' : label}
				</p>
			</div>
			{error && <p className='text-[11px] text-[var(--color-error)] mt-1'>{error}</p>}
		</div>
	)
}

// ── Step 1 — Store Identity ──────────────────────────────────
function Step1({
	form,
	update,
	setLogoUrl,
}: {
	form: OnboardingForm
	update: (k: keyof OnboardingForm, v: string) => void
	setLogoUrl: (url: string | null) => void
}) {
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const logoInputRef = useRef<HTMLInputElement>(null)

	async function handleLogoFile(file: File) {
		setUploading(true)
		setUploadError(null)
		try {
			const url = await uploadFile(file)
			setLogoUrl(url)
		} catch {
			setUploadError('Logo upload failed. Please try again.')
		} finally {
			setUploading(false)
		}
	}

	return (
		<div className='space-y-5'>
			{/* Logo upload area */}
			<div className='flex flex-col items-center gap-3 py-4'>
				<div className='relative'>
					<div
						onClick={() => !uploading && logoInputRef.current?.click()}
						className={cn(
							'w-20 h-20 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer transition-colors',
							form.logoUrl
								? 'border-[var(--color-seller-accent)]'
								: 'bg-[var(--color-seller-accent-muted)] border-[var(--color-seller-accent)]',
						)}
					>
						{form.logoUrl ? (
							<img src={form.logoUrl} alt='Store logo' className='w-full h-full object-cover' />
						) : uploading ? (
							<Loader2 size={22} className='text-[var(--color-seller-accent)] animate-spin' />
						) : (
							<Camera size={22} className='text-[var(--color-seller-accent)]' />
						)}
					</div>
					<button
						type='button'
						onClick={() => !uploading && logoInputRef.current?.click()}
						disabled={uploading}
						className='absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--color-seller-accent)] rounded-full flex items-center justify-center shadow-md disabled:opacity-60'
					>
						{uploading ? (
							<Loader2 size={11} className='text-white animate-spin' />
						) : form.logoUrl ? (
							<Camera size={13} className='text-white' />
						) : (
							<Upload size={13} className='text-white' />
						)}
					</button>
					{form.logoUrl && (
						<button
							type='button'
							onClick={(e) => { e.stopPropagation(); setLogoUrl(null) }}
							className='absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow-sm'
						>
							<X size={10} className='text-white' />
						</button>
					)}
				</div>
				<p className='text-xs text-[var(--color-seller-text-muted)]'>
					{form.logoUrl ? 'Logo uploaded' : 'Upload store logo (optional)'}
				</p>
				{uploadError && <p className='text-xs text-red-500'>{uploadError}</p>}
				<input
					ref={logoInputRef}
					type='file'
					accept='image/jpeg,image/png,image/webp'
					className='hidden'
					onChange={(e) => {
						const file = e.target.files?.[0]
						if (file) handleLogoFile(file)
						e.target.value = ''
					}}
				/>
			</div>

			<Field label='Store Name' required>
				<TextInput
					value={form.storeName}
					onChange={(v) => update('storeName', v)}
					placeholder='e.g. The Good Bakehouse'
					icon={<Store size={15} />}
				/>
			</Field>

			<Field label='Owner / Contact Name' required>
				<TextInput
					value={form.ownerName}
					onChange={(v) => update('ownerName', v)}
					placeholder='Your full name'
				/>
			</Field>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<Field label='Email' required>
					<TextInput
						value={form.email}
						onChange={(v) => update('email', v)}
						placeholder='store@email.com'
						type='email'
						icon={<Mail size={15} />}
					/>
				</Field>
				<Field label='Phone' required>
					<TextInput
						value={form.phone}
						onChange={(v) => update('phone', v)}
						placeholder='+91 98765 00000'
						icon={<Phone size={15} />}
					/>
				</Field>
			</div>

			<Field label='Store Category' required>
				<div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
					{CATEGORIES.map((c) => (
						<button
							key={c.value}
							onClick={() => update('category', c.value)}
							className={cn(
								'flex flex-col items-center gap-1 p-3 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
								form.category === c.value
									? 'border-[var(--color-seller-accent)] bg-[var(--color-seller-accent-light)] text-[var(--color-seller-accent)]'
									: 'border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)] hover:border-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-light)]',
							)}
						>
							<span>{c.icon}</span>
							{c.label}
						</button>
					))}
				</div>
			</Field>

			<Field label='Store Description' hint='Tell customers what makes your store special (min. 40 chars)'>
				<TextArea
					value={form.description}
					onChange={(v) => update('description', v)}
					placeholder='Artisan bakery crafting fresh sourdoughs and pastries every morning...'
					rows={4}
				/>
				<p className='text-[10px] text-[var(--color-seller-text-disabled)] mt-1 text-right'>
					{form.description.length} / 300
				</p>
			</Field>
		</div>
	)
}

// ── Step 2 — Location & Hours ────────────────────────────────
function Step2({
	form,
	update,
	toggleDay,
	onGeoResolved,
}: {
	form: OnboardingForm
	update: (k: keyof OnboardingForm, v: string) => void
	toggleDay: (day: string) => void
	onGeoResolved: (lat: number, lng: number, city: string, pincode: string) => void
}) {
	const [pinPos, setPinPos] = useState({ lat: 20.5937, lng: 78.9629 })
	const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
	const [geocoding, setGeocoding] = useState(false)
	const [geocodeError, setGeocodeError] = useState(false)
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
					onGeoResolved(loc.lat, loc.lng, loc.city, loc.pincode)
					if (!form.city) update('city', loc.city)
					if (!form.pincode) update('pincode', loc.pincode)
				} catch {
					setGeocodeError(true)
				} finally {
					setGeocoding(false)
				}
			}, 600)
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[onGeoResolved],
	)

	const handlePinMove = useCallback(
		(ll: { lat: number; lng: number }) => {
			setPinPos(ll)
			scheduleGeocode(ll)
		},
		[scheduleGeocode],
	)

	// Auto-detect GPS on mount — checks permission state first.
	useEffect(() => {
		if (!navigator.geolocation) return
		setLocating(true)
		requestPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }).then((result) => {
			if (result.ok) {
				const ll = { lat: result.lat, lng: result.lng }
				setPinPos(ll)
				setFlyTarget(ll)
				scheduleGeocode(ll)
			} else if (result.message.includes('blocked')) {
				setGeoError(result.message)
			} else {
				setGeoError('Could not auto-detect location. Pin your store on the map.')
			}
			setLocating(false)
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	async function handleUseMyLocation() {
		if (!navigator.geolocation) { setGeoError('Geolocation not supported.'); return }
		setLocating(true)
		setGeoError(null)
		const result = await requestPosition({ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 })
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
		<div className='space-y-5'>
			{/* ── Live map for geo coordinates ── */}
			<div className='space-y-1.5'>
				<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>
					Pin your store location <span className='text-red-500 ml-0.5'>*</span>
				</label>
				<p className='text-[11px] text-[var(--color-seller-text-muted)]'>
					Drag the pin or tap the map to place your store. Used for customer distance & discovery.
				</p>
				<div className='relative rounded-[var(--radius-lg)] overflow-hidden border border-[var(--color-seller-border)] shadow-sm' style={{ height: 260 }}>
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

					{/* Use my location button */}
					<button
						type='button'
						onClick={handleUseMyLocation}
						disabled={locating}
						className={cn(
							'absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold shadow-lg transition-all',
							'bg-white text-[var(--color-seller-accent)] border border-[var(--color-seller-accent)]/30',
							'hover:bg-[var(--color-seller-accent)] hover:text-white hover:border-transparent',
							locating && 'opacity-60 pointer-events-none',
						)}
					>
						{locating
							? <Loader2 size={12} className='animate-spin' />
							: <LocateFixed size={12} />
						}
						{locating ? 'Locating…' : 'Use my location'}
					</button>

					{/* Geocoding spinner */}
					{geocoding && (
						<div className='absolute top-3 left-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 shadow text-xs text-[var(--color-seller-text-secondary)]'>
							<Loader2 size={11} className='animate-spin' />
							Resolving location…
						</div>
					)}
				</div>

				{/* Geo coordinate display */}
				{form.lat !== null && form.lng !== null && (
					<div className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-seller-accent-light)] border border-[var(--color-seller-border-subtle)]'>
						<MapPin size={12} className='text-[var(--color-seller-accent)] flex-shrink-0' />
						<span className='text-[11px] text-[var(--color-seller-text-secondary)] font-mono'>
							{form.lat.toFixed(6)}, {form.lng.toFixed(6)}
						</span>
					</div>
				)}

				{geocodeError && (
					<p className='text-[11px] text-[var(--color-error)]'>Could not resolve address from pin. Please enter manually below.</p>
				)}
				{geoError && (
					<p className='text-[11px] text-amber-600'>{geoError}</p>
				)}
			</div>

			{/* ── Manual address entry for accuracy ── */}
			<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] p-4 space-y-4 bg-white'>
				<p className='text-xs font-semibold text-[var(--color-seller-text-secondary)] uppercase tracking-wide'>
					Enter full address for accuracy
				</p>

				<Field label='Street Address' required>
					<TextInput
						value={form.address}
						onChange={(v) => update('address', v)}
						placeholder='Shop 3, Hill Road, Bandra West'
						icon={<MapPin size={15} />}
					/>
				</Field>

				<div className='grid grid-cols-2 gap-4'>
					<Field label='City' required>
						<TextInput
							value={form.city}
							onChange={(v) => update('city', v)}
							placeholder='Auto-filled from map'
							icon={<Building2 size={15} />}
						/>
					</Field>
					<Field label='PIN Code' required>
						<TextInput
							value={form.pincode}
							onChange={(v) => update('pincode', v)}
							placeholder='Auto-filled from map'
						/>
					</Field>
				</div>
			</div>

			{/* ── Operating hours ── */}
			<Field label='Operating Hours' required hint='Set your store open and close times'>
				<div className='flex items-center gap-3'>
					<div className='flex-1 space-y-1'>
						<p className='text-xs text-[var(--color-seller-text-muted)]'>Opens at</p>
						<input
							type='time'
							value={form.openTime}
							onChange={(e) => update('openTime', e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)] transition-colors'
						/>
					</div>
					<div className='flex items-center justify-center pt-5'>
						<Clock size={16} className='text-[var(--color-seller-text-muted)]' />
					</div>
					<div className='flex-1 space-y-1'>
						<p className='text-xs text-[var(--color-seller-text-muted)]'>Closes at</p>
						<input
							type='time'
							value={form.closeTime}
							onChange={(e) => update('closeTime', e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)] transition-colors'
						/>
					</div>
				</div>
			</Field>

			<Field label='Closed Days' hint='Select days your store is closed (leave blank if open every day)'>
				<div className='flex flex-wrap gap-2'>
					{DAYS.map((day) => {
						const closed = form.closedDays.includes(day)
						return (
							<button
								key={day}
								onClick={() => toggleDay(day)}
								className={cn(
									'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
									closed
										? 'bg-[var(--color-seller-accent)] text-white border-[var(--color-seller-accent)]'
										: 'border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)] hover:border-[var(--color-seller-accent)]',
								)}
							>
								{day.slice(0, 3)}
							</button>
						)
					})}
				</div>
			</Field>
		</div>
	)
}

// ── Step 3 — Documents ───────────────────────────────────────
function Step3({
	form,
	update,
	setFssaiCertUrl,
	setBankStatementUrl,
}: {
	form: OnboardingForm
	update: (k: keyof OnboardingForm, v: string) => void
	setFssaiCertUrl: (url: string | null) => void
	setBankStatementUrl: (url: string | null) => void
}) {
	return (
		<div className='space-y-5'>
			{/* Info banner */}
			<div className='flex gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-seller-accent-light)] border border-[var(--color-seller-border-subtle)]'>
				<AlertCircle size={16} className='text-[var(--color-seller-accent)] flex-shrink-0 mt-0.5' />
				<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>
					Your documents are encrypted and reviewed by our compliance team within 24 hours. You can start
					adding listings while verification is pending.
				</p>
			</div>

			<Field label='FSSAI License Number' required hint='14-digit Food Safety and Standards Authority of India license'>
				<TextInput
					value={form.fssaiLicense}
					onChange={(v) => update('fssaiLicense', v)}
					placeholder='FSSAI-MH-2024-00000'
					icon={<FileText size={15} />}
				/>
			</Field>

			<UploadDropzone
				label='Upload FSSAI certificate (PDF or JPG)'
				accept='image/jpeg,image/png,application/pdf'
				currentUrl={form.fssaiCertUrl}
				onUploaded={(url) => setFssaiCertUrl(url)}
			/>

			<Field label='GST Number' hint='Optional — required for invoicing above ₹20L/year'>
				<TextInput
					value={form.gstNumber}
					onChange={(v) => update('gstNumber', v)}
					placeholder='27AADCB2230M1Z3'
					icon={<FileText size={15} />}
				/>
			</Field>

			<div className='pt-1'>
				<p className='text-sm font-semibold text-[var(--color-seller-text-primary)] mb-3'>Bank Account for Payouts</p>
				<div className='space-y-4'>
					<Field label='Account Number' required>
						<TextInput
							value={form.bankAccount}
							onChange={(v) => update('bankAccount', v)}
							placeholder='Enter account number'
						/>
					</Field>
					<Field label='IFSC Code' required>
						<TextInput
							value={form.ifsc}
							onChange={(v) => update('ifsc', v)}
							placeholder='e.g. HDFC0001234'
						/>
					</Field>
				</div>
			</div>

			<UploadDropzone
				label='Upload cancelled cheque or bank statement (PDF or JPG)'
				accept='image/jpeg,image/png,application/pdf'
				currentUrl={form.bankStatementUrl}
				onUploaded={(url) => setBankStatementUrl(url)}
			/>
		</div>
	)
}

// ── Step 4 — Preview / Go Live ───────────────────────────────
function Step4({ form }: { form: OnboardingForm }) {
	const cat = CATEGORIES.find((c) => c.value === form.category)
	const closedText = form.closedDays.length > 0 ? form.closedDays.map((d) => d.slice(0, 3)).join(', ') : 'Open every day'

	const checks = [
		{ label: 'Store name & description', done: !!form.storeName && form.description.length >= 10 },
		{ label: 'Contact info', done: !!form.email && !!form.phone },
		{ label: 'Location & hours', done: !!form.address && !!form.city },
		{ label: 'FSSAI license', done: !!form.fssaiLicense },
		{ label: 'Bank account linked', done: !!form.bankAccount && !!form.ifsc },
	]
	const allDone = checks.every((c) => c.done)

	return (
		<div className='space-y-5'>
			{/* Store preview card */}
			<div className='rounded-[var(--radius-xl)] border border-[var(--color-seller-border)] overflow-hidden bg-white'>
				{/* Cover */}
				<div className='h-24 bg-gradient-to-br from-[var(--color-seller-secondary)] to-[var(--color-seller-accent-muted)] flex items-center justify-center'>
					<span className='text-[var(--color-seller-accent)]'>{cat?.icon ?? <Store size={36} />}</span>
				</div>
				<div className='p-4 -mt-6 relative'>
					<div className='w-14 h-14 rounded-full bg-white border-2 border-[var(--color-seller-border)] flex items-center justify-center shadow-sm mb-3 overflow-hidden text-[var(--color-seller-accent)]'>
						{form.logoUrl ? (
							<img src={form.logoUrl} alt='Logo' className='w-full h-full object-cover' />
						) : (
							cat?.icon ?? <Store size={22} />
						)}
					</div>
					<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						{form.storeName || 'Your Store Name'}
					</h2>
					<p className='text-xs text-[var(--color-seller-text-muted)] mb-1'>{cat?.label ?? 'Category'}</p>
					{form.description && (
						<p className='text-sm text-[var(--color-seller-text-secondary)] leading-relaxed line-clamp-2 mt-1'>
							{form.description}
						</p>
					)}
					{form.address && (
						<div className='flex items-center gap-1 mt-2'>
							<MapPin size={12} className='text-[var(--color-seller-text-muted)]' />
							<span className='text-xs text-[var(--color-seller-text-muted)]'>
								{form.address}, {form.city}
							</span>
						</div>
					)}
					{form.openTime && form.closeTime && (
						<div className='flex items-center gap-1 mt-1'>
							<Clock size={12} className='text-[var(--color-seller-text-muted)]' />
							<span className='text-xs text-[var(--color-seller-text-muted)]'>
								{form.openTime} – {form.closeTime} · {closedText}
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Checklist */}
			<div className='space-y-2'>
				<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>Setup checklist</p>
				{checks.map((c) => (
					<div key={c.label} className='flex items-center gap-2.5'>
						<div
							className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
								c.done ? 'bg-[var(--color-seller-eco-muted)]' : 'bg-[var(--color-seller-border-subtle)]',
							)}
						>
							<CheckCircle2 size={13} className={c.done ? 'text-[#2d8a4e]' : 'text-[var(--color-seller-text-disabled)]'} />
						</div>
						<span className={cn('text-sm', c.done ? 'text-[var(--color-seller-text-primary)]' : 'text-[var(--color-seller-text-muted)] line-through')}>
							{c.label}
						</span>
					</div>
				))}
			</div>

			{/* Eco impact teaser */}
			<div className='rounded-[var(--radius-lg)] bg-gradient-to-br from-[#1a3a28] to-[#2d5a3e] p-4 flex items-center gap-4'>
				<Leaf size={28} className='text-[#7ecfa0] flex-shrink-0' />
				<div>
					<p className='text-white font-semibold text-sm'>Join 2,400+ sellers reducing food waste</p>
					<p className='text-white/60 text-xs mt-0.5'>
						Together we've saved 48,000 kg of food from landfill this month.
					</p>
				</div>
			</div>

			{!allDone && (
				<div className='flex gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-warning-light)] border border-amber-200'>
					<AlertCircle size={15} className='text-amber-600 flex-shrink-0 mt-0.5' />
					<p className='text-xs text-amber-700'>
						Some required fields are missing. You can still go live but your store will be pending verification.
					</p>
				</div>
			)}
		</div>
	)
}

// ── Main Onboarding Page ─────────────────────────────────────
export function SellerOnboardingPage() {
	const navigate = useNavigate()
	const { refreshUser } = useAuth()
	const { onboardingStep, setOnboardingStep } = useSellerUIStore()

	// Use the store's step but mirror to local for animation direction
	const [animDir, setAnimDir] = useState<1 | -1>(1)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const step = onboardingStep // 0-indexed → steps are 0,1,2,3

	const [form, setForm] = useState<OnboardingForm>({
		storeName: '',
		ownerName: '',
		email: '',
		phone: '',
		category: '',
		description: '',
		logoUrl: null,
		lat: null,
		lng: null,
		address: '',
		city: '',
		pincode: '',
		openTime: '08:00',
		closeTime: '21:00',
		closedDays: [],
		fssaiLicense: '',
		fssaiCertUrl: null,
		gstNumber: '',
		bankAccount: '',
		ifsc: '',
		bankStatementUrl: null,
	})

	function update(key: keyof OnboardingForm, value: string) {
		setForm((f) => ({ ...f, [key]: value }))
	}

	function handleGeoResolved(lat: number, lng: number, city: string, pincode: string) {
		setForm((f) => ({ ...f, lat, lng, city: f.city || city, pincode: f.pincode || pincode }))
	}

	function toggleDay(day: string) {
		setForm((f) => ({
			...f,
			closedDays: f.closedDays.includes(day)
				? f.closedDays.filter((d) => d !== day)
				: [...f.closedDays, day],
		}))
	}

	function next() {
		setAnimDir(1)
		if (step < 3) setOnboardingStep(step + 1)
	}

	function prev() {
		setAnimDir(-1)
		if (step > 0) setOnboardingStep(step - 1)
	}

	async function finish() {
		setIsSubmitting(true)
		try {
			await profileApi.updateSellerProfile({
				// Step 1
				business_name: form.storeName || null,
				business_type: form.category || null,
				phone_number: form.phone || null,
				description: form.description || null,
				logo_url: form.logoUrl,
				// Step 2
				address_line1: form.address || null,
				city: form.city || null,
				postal_code: form.pincode || null,
				country: 'IN',
				lat: form.lat,
				lng: form.lng,
				open_time: form.openTime || null,
				close_time: form.closeTime || null,
				closed_days: form.closedDays.length > 0 ? JSON.stringify(form.closedDays) : null,
				// Step 3
				license_number: form.fssaiLicense || null,
				fssai_certificate_url: form.fssaiCertUrl,
				gst_number: form.gstNumber || null,
				bank_account: form.bankAccount || null,
				ifsc: form.ifsc || null,
				bank_statement_url: form.bankStatementUrl,
			})
		} catch {
			// Non-blocking — proceed to dashboard even if profile update fails
		} finally {
			setIsSubmitting(false)
		}
		await refreshUser()
		navigate('/seller/dashboard', { replace: true })
	}

	const isLastStep = step === 3

	// Slide variants driven by direction
	const variants = {
		enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
		center: { opacity: 1, x: 0 },
		exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
	}

	return (
		<div className='min-h-dvh bg-[var(--color-seller-bg)] flex flex-col'>
			{/* ── Top bar ── */}
			<div className='sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--color-seller-border)]'>
				<div className='max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3'>
					<div className='flex items-center gap-2'>
						<div className='w-7 h-7 rounded-full bg-[var(--color-seller-accent)] flex items-center justify-center'>
							<Store size={14} className='text-white' />
						</div>
						<span className='text-sm font-semibold text-[var(--color-seller-text-primary)] font-[var(--font-display)]'>
							RePlate Seller
						</span>
					</div>
					<span className='text-xs text-[var(--color-seller-text-muted)]'>
						Step {step + 1} of {STEPS.length}
					</span>
				</div>

				{/* Progress bar */}
				<div className='h-1 bg-[var(--color-seller-border-subtle)]'>
					<motion.div
						className='h-full bg-[var(--color-seller-accent)] rounded-r-full'
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
												? 'bg-[var(--color-seller-accent)] border-[var(--color-seller-accent)]'
												: active
													? 'bg-white border-[var(--color-seller-accent)] shadow-sm'
													: 'bg-white border-[var(--color-seller-border)]',
										)}
									>
										{done ? (
											<CheckCircle2 size={16} className='text-white' />
										) : (
											<Icon size={16} className={active ? 'text-[var(--color-seller-accent)]' : 'text-[var(--color-seller-text-disabled)]'} />
										)}
									</div>
									<span
										className={cn(
											'text-[10px] font-medium whitespace-nowrap',
											active ? 'text-[var(--color-seller-accent)]' : done ? 'text-[var(--color-seller-text-muted)]' : 'text-[var(--color-seller-text-disabled)]',
										)}
									>
										{s.label}
									</span>
								</div>
								{i < STEPS.length - 1 && (
									<div
										className={cn(
											'flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all',
											i < step ? 'bg-[var(--color-seller-accent)]' : 'bg-[var(--color-seller-border)]',
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
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						{step === 0 && 'Tell us about your store'}
						{step === 1 && 'Where is your store?'}
						{step === 2 && 'Compliance & payouts'}
						{step === 3 && 'Ready to go live!'}
					</h1>
					<p className='text-sm text-[var(--color-seller-text-muted)] mt-1'>
						{step === 0 && 'Help customers find and trust your store.'}
						{step === 1 && 'Set your location and operating schedule.'}
						{step === 2 && "We'll verify your documents within 24 hours."}
						{step === 3 && 'Review your store details before going live.'}
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
						{step === 0 && (
							<Step1
								form={form}
								update={update}
								setLogoUrl={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
							/>
						)}
						{step === 1 && <Step2 form={form} update={update} toggleDay={toggleDay} onGeoResolved={handleGeoResolved} />}
						{step === 2 && (
							<Step3
								form={form}
								update={update}
								setFssaiCertUrl={(url) => setForm((f) => ({ ...f, fssaiCertUrl: url }))}
								setBankStatementUrl={(url) => setForm((f) => ({ ...f, bankStatementUrl: url }))}
							/>
						)}
						{step === 3 && <Step4 form={form} />}
					</motion.div>
				</AnimatePresence>
			</div>

			{/* ── Footer navigation ── */}
			<div className='sticky bottom-0 bg-white border-t border-[var(--color-seller-border)] px-4 py-3'>
				<div className='max-w-xl mx-auto flex items-center gap-3'>
					{step > 0 ? (
						<button
							onClick={prev}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-seller-border)] text-sm font-medium text-[var(--color-seller-text-secondary)] hover:border-[var(--color-seller-accent)] hover:text-[var(--color-seller-accent)] transition-colors'
						>
							<ChevronLeft size={16} />
							Back
						</button>
					) : (
						<button
							onClick={() => navigate('/seller/dashboard')}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-seller-border)] text-sm font-medium text-[var(--color-seller-text-muted)] hover:border-[var(--color-seller-accent)] transition-colors'
						>
							Skip for now
						</button>
					)}

					<button
						onClick={isLastStep ? finish : next}
						disabled={isSubmitting}
						className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[var(--color-seller-accent)] text-white text-sm font-semibold hover:bg-[var(--color-seller-accent-hover)] active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed'
					>
						{isLastStep ? (
							isSubmitting ? (
								<Loader2 size={16} className='animate-spin' />
							) : (
								<>
									<Sparkles size={16} />
									Go Live
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
