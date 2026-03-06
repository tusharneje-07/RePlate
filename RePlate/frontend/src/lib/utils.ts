import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
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

export function co2Saved(weightKg: number): number {
	return Number((weightKg * 2.5).toFixed(1))
}

export function clampText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return `${text.slice(0, maxLength)}...`
}
