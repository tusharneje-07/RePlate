import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MapPin, LocateFixed, X, Check, Loader2, AlertCircle } from 'lucide-react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { useLocationStore, type UserLocation } from '@/stores/location-store'
import { requestPosition } from '@/lib/geolocation'
import { cn } from '@/lib/utils'

// ── Fix Leaflet's broken default icon paths (Vite / bundler issue) ──
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
	iconUrl: markerIcon,
	iconRetinaUrl: markerIcon2x,
	shadowUrl: markerShadow,
})

// ── Custom accent-colored pin icon ──────────────────────────────
const accentIcon = L.divIcon({
	className: '',
	html: `
		<div style="
			width: 36px;
			height: 36px;
			background: #f86e0b;
			border-radius: 50% 50% 50% 0;
			transform: rotate(-45deg);
			border: 3px solid white;
			box-shadow: 0 3px 14px rgba(0,0,0,0.35);
		"></div>
	`,
	iconSize: [36, 36],
	iconAnchor: [18, 36],
	popupAnchor: [0, -36],
})

// ── Types ────────────────────────────────────────────────────────
interface LatLng {
	lat: number
	lng: number
}

interface NominatimResult {
	display_name: string
	address: {
		road?: string
		suburb?: string
		neighbourhood?: string
		city?: string
		town?: string
		village?: string
		county?: string
		state_district?: string
		postcode?: string
		state?: string
		country?: string
	}
}

// ── Reverse geocode via OpenStreetMap Nominatim ──────────────────
async function reverseGeocode(lat: number, lng: number): Promise<UserLocation> {
	const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
	const res = await fetch(url, {
		headers: { 'Accept-Language': 'en', 'User-Agent': 'RePlate-App/1.0' },
	})
	if (!res.ok) throw new Error('Geocode failed')
	const data: NominatimResult = await res.json()
	const a = data.address

	const road = a.road ?? a.neighbourhood ?? a.suburb ?? ''
	const suburb = a.suburb ?? a.neighbourhood ?? ''
	const city = a.city ?? a.town ?? a.village ?? a.county ?? ''
	const pincode = a.postcode ?? ''

	// Build a human-readable short address: "Road, Suburb, City"
	const parts = [road, suburb !== road ? suburb : '', city]
		.filter(Boolean)
		.filter((v, i, arr) => arr.indexOf(v) === i) // deduplicate
	const address = parts.join(', ') || data.display_name

	return { lat, lng, address, city, pincode }
}

// ── Inner component: listens to map clicks and drag ──────────────
function MapClickHandler({
	position,
	onMove,
}: {
	position: LatLng
	onMove: (ll: LatLng) => void
}) {
	useMapEvents({
		click(e) {
			onMove({ lat: e.latlng.lat, lng: e.latlng.lng })
		},
	})

	return (
		<Marker
			position={[position.lat, position.lng]}
			icon={accentIcon}
			draggable
			eventHandlers={{
				dragend(e) {
					const ll = (e.target as L.Marker).getLatLng()
					onMove({ lat: ll.lat, lng: ll.lng })
				},
			}}
		/>
	)
}

// ── Fly-to helper when GPS location arrives ──────────────────────
function FlyTo({ target }: { target: LatLng | null }) {
	const map = useMap()
	const prevRef = useRef<LatLng | null>(null)
	useEffect(() => {
		if (target && target !== prevRef.current) {
			prevRef.current = target
			map.flyTo([target.lat, target.lng], 16, { duration: 1.2 })
		}
	}, [target, map])
	return null
}

// ── Main modal ───────────────────────────────────────────────────
export function LocationPickerModal() {
	const { isPickerOpen, closePicker, setLocation } = useLocationStore()

	// Default center: Mumbai
	const defaultCenter: LatLng = { lat: 19.076, lng: 72.8777 }

	const [pinPosition, setPinPosition] = useState<LatLng>(defaultCenter)
	const [flyTarget, setFlyTarget] = useState<LatLng | null>(null)
	const [geocoding, setGeocoding] = useState(false)
	const [geocodeError, setGeocodeError] = useState(false)
	const [resolvedLocation, setResolvedLocation] = useState<UserLocation | null>(null)
	const [locating, setLocating] = useState(false)
	const [geoError, setGeoError] = useState<string | null>(null)
	const geocodeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	// Debounced reverse geocode when pin moves
	const scheduleGeocode = useCallback((ll: LatLng) => {
		if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current)
		setGeocoding(true)
		setGeocodeError(false)
		setResolvedLocation(null)
		geocodeTimerRef.current = setTimeout(async () => {
			try {
				const loc = await reverseGeocode(ll.lat, ll.lng)
				setResolvedLocation(loc)
			} catch {
				setGeocodeError(true)
			} finally {
				setGeocoding(false)
			}
		}, 600)
	}, [])

	const handlePinMove = useCallback(
		(ll: LatLng) => {
			setPinPosition(ll)
			scheduleGeocode(ll)
		},
		[scheduleGeocode],
	)

	// On open: immediately attempt GPS auto-detect
	// Uses requestPosition which checks permission state first — if denied it
	// returns an error immediately instead of silently failing with no prompt.
	useEffect(() => {
		if (!isPickerOpen) return
		if (!navigator.geolocation) {
			scheduleGeocode(pinPosition)
			return
		}
		setLocating(true)
		setGeoError(null)
		requestPosition().then((result) => {
			if (result.ok) {
				const ll = { lat: result.lat, lng: result.lng }
				setPinPosition(ll)
				setFlyTarget(ll)
				scheduleGeocode(ll)
			} else {
				// GPS failed or denied — fall back to geocoding the default center
				scheduleGeocode(pinPosition)
				// Only surface an error if explicitly denied (don't show error on silent timeout)
				if (result.message.includes('blocked')) setGeoError(result.message)
			}
			setLocating(false)
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPickerOpen])

	// "Use my location" — checks permission first, then requests GPS
	async function handleUseMyLocation() {
		if (!navigator.geolocation) {
			setGeoError('Geolocation is not supported by your browser.')
			return
		}
		setLocating(true)
		setGeoError(null)
		const result = await requestPosition()
		setLocating(false)
		if (result.ok) {
			const ll = { lat: result.lat, lng: result.lng }
			setPinPosition(ll)
			setFlyTarget(ll)
			scheduleGeocode(ll)
		} else {
			setGeoError(result.message)
		}
	}

	function handleConfirm() {
		if (!resolvedLocation) return
		setLocation(resolvedLocation)
	}

	function handleClose() {
		closePicker()
		setGeoError(null)
		setGeocodeError(false)
	}

	return (
		<AnimatePresence>
			{isPickerOpen && (
				<motion.div
					key='location-picker-backdrop'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className='fixed inset-0 z-[9999] flex items-end sm:items-center justify-center'
					style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
					onClick={(e) => e.target === e.currentTarget && handleClose()}
				>
					<motion.div
						key='location-picker-panel'
						initial={{ y: 80, opacity: 0, scale: 0.97 }}
						animate={{ y: 0, opacity: 1, scale: 1 }}
						exit={{ y: 80, opacity: 0, scale: 0.97 }}
						transition={{ type: 'spring', damping: 26, stiffness: 300 }}
						className='relative w-full sm:max-w-lg bg-[var(--color-surface-card)] sm:rounded-[var(--radius-xl)] rounded-t-[var(--radius-xl)] overflow-hidden shadow-2xl'
						style={{ maxHeight: '92dvh' }}
					>
						{/* Header */}
						<div className='flex items-center justify-between px-4 py-3.5 border-b border-[var(--color-border)]'>
							<div className='flex items-center gap-2.5'>
								<div className='w-8 h-8 rounded-full bg-[var(--color-brand-accent)]/10 flex items-center justify-center'>
									<MapPin size={16} className='text-[var(--color-brand-accent)]' />
								</div>
								<div>
									<p className='text-sm font-semibold text-[var(--color-text-primary)]'>Set Delivery Location</p>
									<p className='text-[11px] text-[var(--color-text-muted)]'>Drag the pin or tap on the map</p>
								</div>
							</div>
							<button
								type='button'
								onClick={handleClose}
								className='w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
							>
								<X size={16} />
							</button>
						</div>

						{/* Map */}
						<div className='relative' style={{ height: '340px' }}>
							<MapContainer
								center={[pinPosition.lat, pinPosition.lng]}
								zoom={14}
								style={{ height: '100%', width: '100%' }}
								zoomControl={false}
								attributionControl={false}
							>
								<TileLayer
									url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
									attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
								/>
								<MapClickHandler position={pinPosition} onMove={handlePinMove} />
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
									locating && 'opacity-70 pointer-events-none',
								)}
							>
								{locating ? (
									<Loader2 size={13} className='animate-spin' />
								) : (
									<LocateFixed size={13} />
								)}
								{locating ? 'Locating…' : 'Use my location'}
							</button>
						</div>

						{/* Address preview + confirm */}
						<div className='px-4 py-4 space-y-3'>
							{/* Geo permission error */}
							{geoError && (
								<motion.div
									initial={{ opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									className='flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-red-50 border border-red-200'
								>
									<AlertCircle size={14} className='text-red-500 flex-shrink-0 mt-0.5' />
									<p className='text-xs text-red-700'>{geoError}</p>
								</motion.div>
							)}

							{/* Resolved address preview */}
							<div className='flex items-start gap-3 px-3 py-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]'>
								<MapPin size={15} className='text-[var(--color-brand-accent)] flex-shrink-0 mt-0.5' />
								<div className='flex-1 min-w-0'>
									{geocoding ? (
										<div className='flex items-center gap-2'>
											<Loader2 size={13} className='animate-spin text-[var(--color-text-muted)]' />
											<span className='text-xs text-[var(--color-text-muted)]'>Finding address…</span>
										</div>
									) : geocodeError ? (
										<p className='text-xs text-[var(--color-text-muted)]'>Could not resolve address. You can still confirm.</p>
									) : resolvedLocation ? (
										<>
											<p className='text-sm font-medium text-[var(--color-text-primary)] leading-snug'>{resolvedLocation.address}</p>
											{resolvedLocation.city && (
												<p className='text-[11px] text-[var(--color-text-muted)] mt-0.5'>{resolvedLocation.city}{resolvedLocation.pincode ? ` – ${resolvedLocation.pincode}` : ''}</p>
											)}
										</>
									) : (
										<p className='text-xs text-[var(--color-text-muted)]'>Tap the map to set your location</p>
									)}
								</div>
							</div>

							{/* Confirm button */}
							<Button
								className='w-full'
								onClick={handleConfirm}
								disabled={!resolvedLocation || geocoding}
							>
								<Check size={15} className='mr-1.5' />
								Confirm Location
							</Button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
