import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

// ── IST (India Standard Time, UTC+5:30) helpers ───────────────────────────────
// All datetime display and datetime-local input values must use IST.
// These helpers are the single source of truth for IST formatting.

const IST = 'Asia/Kolkata'

/**
 * Format a Date (or ISO string) as a time string in IST, e.g. "03:45 PM".
 * Use this everywhere toLocaleTimeString() was used.
 */
export function formatTimeIST(date: Date | string, hour12 = true): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return new Intl.DateTimeFormat('en-IN', {
		hour: '2-digit',
		minute: '2-digit',
		hour12,
		timeZone: IST,
	}).format(d)
}

/**
 * Format a Date (or ISO string) as a date string in IST, e.g. "7 Mar 2026".
 */
export function formatDateIST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return new Intl.DateTimeFormat('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone: IST,
		...options,
	}).format(d)
}

/**
 * Format a Date (or ISO string) as a date+time string in IST.
 */
export function formatDateTimeIST(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
	const d = typeof date === 'string' ? new Date(date) : date
	return new Intl.DateTimeFormat('en-IN', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
		timeZone: IST,
		...options,
	}).format(d)
}

/**
 * Convert a Date to a "YYYY-MM-DDTHH:MM" string in IST local time.
 * Use this for the `value`, `min`, and `max` props of <input type="datetime-local">.
 * Never use new Date().toISOString().slice(0,16) — that gives UTC, not IST.
 */
export function toLocalDatetimeStr(date: Date): string {
	const parts = new Intl.DateTimeFormat('en-CA', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
		timeZone: IST,
	}).formatToParts(date)

	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
	const hh = get('hour') === '24' ? '00' : get('hour') // midnight edge-case
	return `${get('year')}-${get('month')}-${get('day')}T${hh}:${get('minute')}`
}

/**
 * Parse a datetime-local string (YYYY-MM-DDTHH:MM) entered by the user
 * as IST and return a proper UTC Date object.
 * Use this when reading form.someField from a datetime-local input before
 * sending to the backend.
 */
export function parseDatetimeLocalAsIST(localStr: string): Date {
	// localStr is "YYYY-MM-DDTHH:MM" — we interpret it as IST (+05:30)
	return new Date(`${localStr}:00+05:30`)
}

export function formatCurrency(amount: number, currency = 'INR'): string {
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount)
}

export function formatDistance(meters: number): string {
	if (meters < 1000) return `${meters}m`
	return `${(meters / 1000).toFixed(1)}km`
}

export function formatPickupTime(date: Date): string {
	return new Intl.DateTimeFormat('en-IN', {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true,
		timeZone: IST,
	}).format(date)
}

export function formatRelativeTime(date: Date): string {
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	if (diffMins < 1) return 'just now'
	if (diffMins < 60) return `${diffMins}m ago`
	const diffHours = Math.floor(diffMins / 60)
	if (diffHours < 24) return `${diffHours}h ago`
	const diffDays = Math.floor(diffHours / 24)
	return `${diffDays}d ago`
}

export function calculateDiscount(original: number, discounted: number): number {
	return Math.round(((original - discounted) / original) * 100)
}

// ── Environmental impact formulas ─────────────────────────────────────────────
// Single source of truth for all CO₂ / equivalency calculations.
// Factors from EPA / WRAP food waste research.

/** kg CO₂ prevented per kg of food saved */
export const CO2_PER_KG_FOOD = 2.5

/** kg landfill waste reduced per kg of food saved */
export const LANDFILL_PER_KG_FOOD = 0.8

// Equivalency denominators (how many kg CO₂ = 1 unit of the comparison)
/** kg CO₂ absorbed by one tree per year */
export const CO2_PER_TREE_YEAR = 21.9

/** kg CO₂ emitted per km driven in an average car */
export const CO2_PER_CAR_KM = 0.21

/** kg CO₂ emitted per hour of LED light operation */
export const CO2_PER_LED_HOUR = 1 / 12  // 12 h LED ≈ 1 kg CO₂

/** kg CO₂ for a Mumbai → Delhi flight (one way) */
export const CO2_PER_FLIGHT_MUM_DEL = 130

/** Calculate kg CO₂ prevented from food weight saved */
export function co2Saved(foodWeightKg: number): number {
	return Number((foodWeightKg * CO2_PER_KG_FOOD).toFixed(1))
}

/** Infer food weight (kg) from CO₂ saved */
export function foodKgFromCo2(co2Kg: number): number {
	return Number((co2Kg / CO2_PER_KG_FOOD).toFixed(3))
}

/** Trees equivalent for a given CO₂ saving */
export function treesEquivalent(co2Kg: number): number {
	return co2Kg / CO2_PER_TREE_YEAR
}

/** Car km not driven for a given CO₂ saving */
export function carKmEquivalent(co2Kg: number): number {
	return co2Kg / CO2_PER_CAR_KM
}

/** LED light hours for a given CO₂ saving */
export function ledHoursEquivalent(co2Kg: number): number {
	return co2Kg * 12
}

/** Flights avoided for a given CO₂ saving */
export function flightsEquivalent(co2Kg: number): number {
	return co2Kg / CO2_PER_FLIGHT_MUM_DEL
}

export function clampText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return `${text.slice(0, maxLength)}...`
}
