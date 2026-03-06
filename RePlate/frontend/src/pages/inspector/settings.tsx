import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'

function ToggleRow({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint: string }) {
	return (
		<div className='flex items-center justify-between gap-3 py-3 border-b border-[var(--color-inspector-border-subtle)] last:border-b-0'>
			<div>
				<p className='text-sm font-semibold text-[var(--color-inspector-text-primary)]'>{label}</p>
				<p className='text-xs text-[var(--color-inspector-text-muted)] mt-0.5'>{hint}</p>
			</div>
			<button
				onClick={() => onChange(!value)}
				className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-[var(--color-inspector-accent)]' : 'bg-[var(--color-inspector-border)]'}`}
			>
				<span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
			</button>
		</div>
	)
}

export function InspectorSettingsPage() {
	const { logout } = useAuth()
	const [aiAlerts, setAiAlerts] = useState(true)
	const [weatherAlerts, setWeatherAlerts] = useState(true)
	const [complaintAlerts, setComplaintAlerts] = useState(true)
	const [expiryEscalation, setExpiryEscalation] = useState(true)

	return (
		<div className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-4xl mx-auto'>
			<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
				<CardContent className='p-4'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Inspector Settings</h1>
					<p className='text-sm text-[var(--color-inspector-text-muted)] mt-1'>Notification and enforcement preferences for compliance operations.</p>
				</CardContent>
			</Card>

			<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
				<CardContent className='p-4'>
					<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-2'>Alert Preferences</h3>
					<ToggleRow label='AI Risk Alerts' hint='Notify on suspicious listings and anomaly detection.' value={aiAlerts} onChange={setAiAlerts} />
					<ToggleRow label='Weather Risk Alerts' hint='Notify on heat/rain/flood risk for perishable transport.' value={weatherAlerts} onChange={setWeatherAlerts} />
					<ToggleRow label='Complaint Escalations' hint='Notify when severity reaches high or critical.' value={complaintAlerts} onChange={setComplaintAlerts} />
					<ToggleRow label='Expiry Auto-Escalation' hint='Auto-prioritize near-expiry listings into urgent queue.' value={expiryEscalation} onChange={setExpiryEscalation} />
				</CardContent>
			</Card>

			<Card className='border-red-100 bg-white shadow-none'>
				<CardContent className='p-4'>
					<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-2'>Session</h3>
					<button
						type='button'
						onClick={() => logout()}
						className='w-full flex items-center gap-3 py-3 text-left hover:bg-red-50 -mx-1 px-1 rounded-lg transition-colors'
					>
						<div className='w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0'>
							<LogOut size={14} className='text-red-500' />
						</div>
						<div className='flex-1'>
							<p className='text-sm font-semibold text-red-500'>Sign Out</p>
							<p className='text-xs text-[var(--color-inspector-text-muted)]'>Sign out of this device</p>
						</div>
					</button>
				</CardContent>
			</Card>
		</div>
	)
}
