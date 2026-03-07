/**
 * ComplaintTriagePanel
 * Inline triage panel for inspector complaints — calls /api/v1/ai/safety/triage
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Bot,
	Sparkles,
	Shield,
	AlertTriangle,
	CheckCircle2,
	Loader2,
	ChevronDown,
	ChevronUp,
	X,
	ZapOff,
	Zap,
	Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aiApi, type ComplaintTriageResult } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Sub-components ────────────────────────────────────────────

function SeverityBar({ score }: { score: number }) {
	const pct = Math.round(score * 10)
	const color =
		score >= 8
			? 'bg-[var(--color-error)]'
			: score >= 5
				? 'bg-[var(--color-warning)]'
				: 'bg-[var(--color-success)]'
	return (
		<div className='space-y-1'>
			<div className='flex items-center justify-between text-[10px]'>
				<span className='text-[var(--color-inspector-text-muted)]'>Severity</span>
				<span className='font-bold text-[var(--color-inspector-text-primary)]'>{score}/10</span>
			</div>
			<div className='h-2 w-full rounded-full bg-[var(--color-inspector-surface-elevated)] overflow-hidden'>
				<div
					className={cn('h-full rounded-full transition-all duration-500', color)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	)
}

function UrgencyChip({ urgency }: { urgency: string }) {
	const cls =
		urgency === 'immediate'
			? 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]'
			: urgency === 'urgent'
				? 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]'
				: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]'
	return (
		<span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${cls}`}>
			{urgency}
		</span>
	)
}

// ── Main component ────────────────────────────────────────────

interface ComplaintTriagePanelProps {
	/** Complaint text/description */
	complaintText: string
	/** Must match ComplaintTriageRequest complaint_type */
	complaintType?: 'food_quality' | 'hygiene' | 'misleading_info' | 'other'
	complaintId: string
}

export function ComplaintTriagePanel({
	complaintText,
	complaintType = 'other',
	complaintId,
}: ComplaintTriagePanelProps) {
	const [data, setData] = useState<ComplaintTriageResult | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [expanded, setExpanded] = useState(false)

	const run = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await aiApi.triageComplaint({
				complaint_text: complaintText,
				complaint_type: complaintType,
			})
			if (res.data.success) {
				setData(res.data.data)
				setExpanded(true)
			} else {
				setError('Triage returned no result.')
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Triage agent unavailable.')
		} finally {
			setLoading(false)
		}
	}

	// Determine risk color from severity
	const riskColor =
		data
			? data.severity_score >= 8
				? 'border-[var(--color-inspector-risk-critical)] bg-[var(--color-inspector-risk-critical-light)]'
				: data.severity_score >= 5
					? 'border-[var(--color-inspector-risk-high)] bg-[var(--color-inspector-risk-high-light)]'
					: 'border-[var(--color-inspector-risk-low)] bg-[var(--color-inspector-risk-low-light)]'
			: 'border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface-elevated)]'

	return (
		<div className={cn('rounded-[var(--radius-lg)] border mt-3 overflow-hidden', riskColor)}>
			{/* Header bar */}
			<div
				className='flex items-center justify-between px-3 py-2 cursor-pointer'
				onClick={() => data && setExpanded((v) => !v)}
			>
				<div className='flex items-center gap-2'>
					<Bot size={13} className='text-[var(--color-inspector-accent)]' />
					<span className='text-xs font-bold text-[var(--color-inspector-text-primary)]'>
						AI Triage
					</span>
					{data && (
						<>
							<UrgencyChip urgency={data.urgency} />
							{data.auto_suspend && (
								<span className='text-[9px] font-bold bg-[var(--color-error)] text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5'>
									<ZapOff size={8} /> Auto-suspend
								</span>
							)}
						</>
					)}
				</div>
				<div className='flex items-center gap-2'>
					{!data ? (
						<Button
							size='sm'
							onClick={(e) => {
								e.stopPropagation()
								void run()
							}}
							disabled={loading}
							className='h-6 text-[10px] px-2.5 bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white flex items-center gap-1'
						>
							{loading ? (
								<><Loader2 size={10} className='animate-spin' /> Triaging…</>
							) : (
								<><Sparkles size={10} /> Run Triage</>
							)}
						</Button>
					) : (
						expanded ? <ChevronUp size={13} className='text-[var(--color-inspector-text-muted)]' /> : <ChevronDown size={13} className='text-[var(--color-inspector-text-muted)]' />
					)}
				</div>
			</div>

			{/* Error */}
			{error && (
				<div className='px-3 pb-2 flex items-center gap-1.5 text-xs text-[var(--color-error)]'>
					<AlertTriangle size={11} /> {error}
				</div>
			)}

			{/* Expanded result */}
			<AnimatePresence>
				{data && expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='overflow-hidden'
					>
						<div className='px-3 pb-3 space-y-3 border-t border-black/5'>
							{/* Severity bar */}
							<div className='pt-3'>
								<SeverityBar score={data.severity_score} />
							</div>

							{/* Summary */}
							<p className='text-[11px] text-[var(--color-inspector-text-secondary)] leading-relaxed italic'>
								"{data.triage_summary}"
							</p>

							{/* Recommended action */}
							<div className='flex items-start gap-2 p-2.5 rounded-[var(--radius-md)] bg-white/60 border border-white/40'>
								<CheckCircle2 size={13} className='text-[var(--color-inspector-accent)] flex-shrink-0 mt-0.5' />
								<div>
									<p className='text-[10px] font-bold text-[var(--color-inspector-text-muted)] uppercase tracking-wide mb-0.5'>Recommended Action</p>
									<p className='text-xs font-semibold text-[var(--color-inspector-text-primary)]'>{data.recommended_action}</p>
								</div>
							</div>

							{/* Safety signals */}
							{data.safety_signals.length > 0 && (
								<div>
									<p className='text-[10px] font-bold text-[var(--color-inspector-text-muted)] uppercase tracking-wide mb-1.5 flex items-center gap-1'>
										<Shield size={10} /> Safety Signals Detected
									</p>
									<div className='flex flex-wrap gap-1.5'>
										{data.safety_signals.map((sig) => (
											<span
												key={sig}
												className='text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/60 border border-black/10 text-[var(--color-inspector-text-secondary)]'
											>
												{sig}
											</span>
										))}
									</div>
								</div>
							)}

							{/* Auto-suspend warning */}
							{data.auto_suspend && (
								<div className='flex items-start gap-2 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-[var(--color-error)]/30'>
									<ZapOff size={13} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
									<p className='text-[11px] text-[var(--color-error)] font-semibold'>
										AI recommends immediate seller suspension pending investigation.
									</p>
								</div>
							)}

							{/* Footer */}
							<div className='flex items-center gap-1.5 text-[10px] text-[var(--color-inspector-text-muted)]'>
								<Info size={10} />
								{data.ai_powered ? 'AI-powered triage · Groq LLM' : 'Rule-based fallback triage'}
								<button
									type='button'
									onClick={run}
									disabled={loading}
									className='ml-auto text-[var(--color-inspector-accent)] hover:underline flex items-center gap-0.5'
								>
									{loading ? <Loader2 size={9} className='animate-spin' /> : null}
									Re-run
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}
