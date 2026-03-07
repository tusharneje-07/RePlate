/**
 * NGOMatchPanel
 * Slide-over panel for NGO Discover page — calls /api/v1/ai/ngo-match
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Bot,
	Sparkles,
	MapPin,
	Clock,
	Weight,
	X,
	Loader2,
	AlertTriangle,
	ChevronRight,
	Trophy,
	Leaf,
	Info,
	Navigation,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { aiApi, type NGOMatchResponse, type NGOMatchResult } from '@/lib/api'
import { cn } from '@/lib/utils'

// ── Sub-components ───────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
	const cls =
		score >= 80
			? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
			: score >= 60
				? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
				: 'bg-[var(--color-ngo-surface-elevated)] text-[var(--color-ngo-text-muted)]'
	return (
		<span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
			{score}%
		</span>
	)
}

function MatchCard({ match, rank }: { match: NGOMatchResult; rank: number }) {
	const urgencyColor =
		match.urgency === 'critical'
			? 'text-[var(--color-error)]'
			: match.urgency === 'high'
				? 'text-[var(--color-warning)]'
				: 'text-[var(--color-ngo-accent)]'

	return (
		<div className='p-3.5 rounded-[var(--radius-lg)] border border-[var(--color-ngo-border)] bg-white hover:shadow-sm transition-shadow'>
			<div className='flex items-start justify-between gap-2 mb-2'>
				<div className='flex items-center gap-2 min-w-0'>
					{rank <= 3 && (
						<span
							className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
								rank === 1
									? 'bg-amber-100 text-amber-700'
									: rank === 2
										? 'bg-slate-100 text-slate-600'
										: 'bg-orange-50 text-orange-600',
							)}
						>
							{rank}
						</span>
					)}
					<p className='text-sm font-bold text-[var(--color-ngo-text-primary)] truncate'>
						{match.title}
					</p>
				</div>
				<div className='flex items-center gap-1.5 flex-shrink-0'>
					<ScoreBadge score={match.match_score} />
					{match.urgency === 'critical' && (
						<span className='text-[9px] font-bold bg-[var(--color-error)] text-white px-1.5 py-0.5 rounded-full animate-pulse'>
							CRITICAL
						</span>
					)}
				</div>
			</div>

			<p className='text-[11px] text-[var(--color-ngo-text-secondary)] italic leading-relaxed mb-2'>
				"{match.match_reason}"
			</p>

			<div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[var(--color-ngo-text-muted)]'>
				<span className='flex items-center gap-1'>
					<Weight size={10} /> {match.quantity_kg} kg
				</span>
				<span className='flex items-center gap-1'>
					<MapPin size={10} /> {match.distance_km.toFixed(1)} km
				</span>
				<span className={cn('flex items-center gap-1 font-semibold', urgencyColor)}>
					<Clock size={10} /> {match.expiry_hours.toFixed(1)}h left
				</span>
				<span className='capitalize'>{match.seller_name}</span>
			</div>

			<div className='mt-2 flex items-center gap-1 text-[10px] text-[var(--color-ngo-accent)] font-medium'>
				<Navigation size={10} /> Priority #{match.pickup_priority}
			</div>
		</div>
	)
}

// ── Main component ────────────────────────────────────────────

interface NGOMatchPanelProps {
	open: boolean
	onClose: () => void
}

export function NGOMatchPanel({ open, onClose }: NGOMatchPanelProps) {
	const [data, setData] = useState<NGOMatchResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [radiusKm, setRadiusKm] = useState(30)

	const load = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await aiApi.getNGOMatches(radiusKm)
			if (res.data.success) {
				setData(res.data.data)
			} else {
				setError('Agent returned no data.')
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Matching service unavailable.')
		} finally {
			setLoading(false)
		}
	}

	// Reset data when panel opens fresh
	const handleOpen = () => {
		if (!data) load()
	}

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional
	if (open && !data && !loading && !error) {
		// auto-load on first open
		void load()
	}

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
						onClick={onClose}
					/>

					{/* Panel */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className='fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[var(--color-ngo-surface)] shadow-2xl flex flex-col'
					>
						{/* Header */}
						<div
							className='flex items-center justify-between px-5 py-4 flex-shrink-0'
							style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}
						>
							<div className='flex items-center gap-3'>
								<div className='w-9 h-9 rounded-[var(--radius-md)] bg-white/20 flex items-center justify-center'>
									<Sparkles size={18} className='text-white' />
								</div>
								<div>
									<p className='text-[10px] font-medium text-emerald-200'>AI-Powered Matching</p>
									<h2 className='text-base font-bold text-white'>Smart Food Match</h2>
								</div>
							</div>
							<button
								type='button'
								onClick={onClose}
								className='p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors'
							>
								<X size={16} />
							</button>
						</div>

						{/* Radius control */}
						<div className='px-5 py-3 border-b border-[var(--color-ngo-border)] bg-[var(--color-ngo-bg)] flex-shrink-0'>
							<div className='flex items-center justify-between mb-1.5'>
								<span className='text-xs font-semibold text-[var(--color-ngo-text-primary)]'>
									Search Radius
								</span>
								<span className='text-xs font-bold text-[var(--color-ngo-accent)]'>{radiusKm} km</span>
							</div>
							<input
								type='range'
								min='5'
								max='100'
								step='5'
								value={radiusKm}
								onChange={(e) => setRadiusKm(Number(e.target.value))}
								className='w-full accent-[var(--color-ngo-accent)]'
							/>
							<Button
								onClick={load}
								disabled={loading}
								size='sm'
								className='w-full mt-2 bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-hover)] text-white flex items-center gap-1.5'
							>
								{loading ? (
									<><Loader2 size={13} className='animate-spin' /> Matching…</>
								) : (
									<><Bot size={13} /> Find Best Matches</>
								)}
							</Button>
						</div>

						{/* Body */}
						<div className='flex-1 overflow-y-auto p-4 space-y-4'>
							{error && (
								<div className='flex items-start gap-2 p-3 bg-[var(--color-error-light)] rounded-[var(--radius-md)]'>
									<AlertTriangle size={14} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
									<p className='text-xs text-[var(--color-error)]'>{error}</p>
								</div>
							)}

							{loading && !data && (
								<div className='flex flex-col items-center justify-center py-16 gap-3'>
									<div className='w-12 h-12 rounded-full bg-[var(--color-ngo-accent-light)] flex items-center justify-center'>
										<Bot size={22} className='text-[var(--color-ngo-accent)] animate-pulse' />
									</div>
									<p className='text-sm text-[var(--color-ngo-text-muted)]'>
										AI is matching donations to your NGO profile…
									</p>
								</div>
							)}

							{data && (
								<>
									{/* Summary strip */}
									<div className='p-3 rounded-[var(--radius-lg)] bg-[var(--color-ngo-eco-muted)] border border-[var(--color-ngo-eco-light)]'>
										<p className='text-xs text-[var(--color-ngo-text-secondary)] leading-relaxed italic'>
											"{data.summary}"
										</p>
										<div className='flex items-center gap-3 mt-2 text-[10px] text-[var(--color-ngo-text-muted)]'>
											<span className='flex items-center gap-1'>
												<Trophy size={10} className='text-amber-500' />
												{data.matches.length} optimal matches
											</span>
											{data.ai_powered && (
												<span className='flex items-center gap-1 text-[var(--color-ngo-accent)] font-semibold'>
													<Sparkles size={10} /> AI-ranked
												</span>
											)}
										</div>
									</div>

									{/* Optimal pickup sequence */}
									{data.pickup_sequence.length > 0 && (
										<div>
											<p className='text-[10px] font-bold text-[var(--color-ngo-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1'>
												<Navigation size={11} /> Optimal Pickup Sequence
											</p>
											<div className='flex items-center gap-1 flex-wrap'>
												{data.pickup_sequence.map((name: string, i: number) => (
													<span key={name} className='flex items-center gap-1'>
														{i > 0 && <ChevronRight size={10} className='text-[var(--color-ngo-text-muted)]' />}
														<span className='text-xs font-medium text-[var(--color-ngo-text-primary)] bg-[var(--color-ngo-surface-elevated)] px-2 py-0.5 rounded-full border border-[var(--color-ngo-border)]'>
															{name}
														</span>
													</span>
												))}
											</div>
										</div>
									)}

									{/* Match cards */}
									<div>
										<p className='text-[10px] font-bold text-[var(--color-ngo-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1'>
											<Leaf size={11} /> Top Matches
										</p>
										<div className='space-y-2.5'>
											{data.matches.map((match: NGOMatchResult, i: number) => (
												<MatchCard key={match.listing_id} match={match} rank={i + 1} />
											))}
										</div>
									</div>

									{/* AI note */}
									<div className='flex items-start gap-2 text-[10px] text-[var(--color-ngo-text-muted)]'>
										<Info size={11} className='flex-shrink-0 mt-0.5' />
										<p>Matches ranked by AI considering your NGO type, capacity, and food urgency. Distances are approximate.</p>
									</div>
								</>
							)}
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}
