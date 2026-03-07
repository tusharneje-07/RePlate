/**
 * AIRecommendations
 * Consumer browse page section — calls /api/v1/ai/recommendations
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Bot,
	Sparkles,
	Star,
	MapPin,
	IndianRupee,
	Leaf,
	Loader2,
	AlertTriangle,
	ChevronRight,
	TrendingUp,
	X,
	RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aiApi, type FoodRecommendation, type RecommendationsResponse } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ── Sub-components ────────────────────────────────────────────

function TagChip({ tag }: { tag: string }) {
	const colors: Record<string, string> = {
		'top pick': 'bg-amber-100 text-amber-700 border-amber-200',
		'nearby': 'bg-blue-50 text-blue-600 border-blue-100',
		'expiring soon': 'bg-red-50 text-red-600 border-red-100',
		'great value': 'bg-green-50 text-green-600 border-green-100',
		'popular': 'bg-purple-50 text-purple-600 border-purple-100',
	}
	const cls = colors[tag.toLowerCase()] ?? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border-[var(--color-border)]'
	return (
		<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cls}`}>
			{tag}
		</span>
	)
}

function RecCard({ rec, index }: { rec: FoodRecommendation; index: number }) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.06 }}
			className='flex-shrink-0 w-52 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-card)] overflow-hidden hover:shadow-md transition-shadow'
		>
			{/* Score bar at top */}
			<div
				className='h-1.5 bg-gradient-to-r from-[var(--color-brand-accent)] to-emerald-400'
				style={{ width: `${rec.match_score}%` }}
			/>

			<div className='p-3'>
				{/* Header */}
				<div className='flex items-start justify-between gap-1 mb-1.5'>
					<p className='text-sm font-bold text-[var(--color-text-primary)] leading-tight line-clamp-2 flex-1'>
						{rec.title}
					</p>
					{rec.tag && <TagChip tag={rec.tag} />}
				</div>

				{/* Seller + distance */}
				<p className='text-[10px] text-[var(--color-text-muted)] mb-2 flex items-center gap-1 truncate'>
					<MapPin size={9} /> {rec.seller_name}
					{rec.distance_km > 0 && ` · ${rec.distance_km.toFixed(1)} km`}
				</p>

				{/* Match reason */}
				<p className='text-[10px] text-[var(--color-text-secondary)] italic leading-relaxed mb-2.5 line-clamp-2'>
					"{rec.match_reason}"
				</p>

				{/* Price row */}
				<div className='flex items-center gap-1.5'>
					<span className='text-base font-bold text-[var(--color-brand-accent)]'>
						{formatCurrency(rec.price)}
					</span>
					{rec.discount_percent > 0 && (
						<span className='text-[9px] font-bold bg-[var(--color-brand-accent)] text-white px-1.5 py-0.5 rounded-full'>
							{Math.round(rec.discount_percent)}% off
						</span>
					)}
				</div>

				{/* Match score */}
				<div className='flex items-center gap-1 mt-1.5'>
					<Star size={9} className='text-amber-400 fill-amber-400' />
					<span className='text-[9px] font-semibold text-[var(--color-text-muted)]'>
						{rec.match_score}% match
					</span>
				</div>
			</div>
		</motion.div>
	)
}

// ── Main component ────────────────────────────────────────────

export function AIRecommendations() {
	const [data, setData] = useState<RecommendationsResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [dismissed, setDismissed] = useState(false)
	const [hasLoaded, setHasLoaded] = useState(false)

	const load = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await aiApi.getRecommendations({ limit: 8 })
			if (res.data.success) {
				setData(res.data.data)
				setHasLoaded(true)
			} else {
				setError('No recommendations available.')
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Recommendations unavailable.')
		} finally {
			setLoading(false)
		}
	}

	if (dismissed) return null

	// ── Not yet loaded — teaser banner ──
	if (!hasLoaded) {
		return (
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				className='relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-brand-accent)]/30'
				style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' }}
			>
				<div className='flex items-center gap-3 p-3.5'>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-brand-accent)] flex items-center justify-center flex-shrink-0'>
						<Sparkles size={16} className='text-white' />
					</div>
					<div className='flex-1 min-w-0'>
						<p className='text-sm font-bold text-[var(--color-text-primary)]'>Personalised For You</p>
						<p className='text-[11px] text-[var(--color-text-muted)]'>
							AI picks based on your order history
						</p>
					</div>
					<Button
						size='sm'
						onClick={load}
						disabled={loading}
						className='bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-white flex-shrink-0 flex items-center gap-1.5'
					>
						{loading ? (
							<><Loader2 size={12} className='animate-spin' /> Loading…</>
						) : (
							<><Bot size={12} /> Show</>
						)}
					</Button>
					<button
						type='button'
						onClick={() => setDismissed(true)}
						className='p-1.5 rounded-full text-[var(--color-text-muted)] hover:bg-black/5 transition-colors flex-shrink-0'
					>
						<X size={14} />
					</button>
				</div>
				{error && (
					<div className='px-4 pb-3 flex items-center gap-1.5 text-xs text-[var(--color-error)]'>
						<AlertTriangle size={12} /> {error}
					</div>
				)}
			</motion.div>
		)
	}

	if (!data) return null

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, y: -8 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, height: 0 }}
				className='space-y-3'
			>
				{/* Section header */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2'>
						<div className='w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-brand-accent)] flex items-center justify-center'>
							<Sparkles size={12} className='text-white' />
						</div>
						<div>
							<h2 className='text-sm font-bold text-[var(--color-text-primary)]'>
								For You
								{data.consumer_level && (
									<span className='ml-2 text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full'>
										{data.consumer_level}
									</span>
								)}
							</h2>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						<button
							type='button'
							onClick={load}
							disabled={loading}
							className='flex items-center gap-1 text-[10px] text-[var(--color-brand-accent)] hover:underline'
						>
							{loading ? <Loader2 size={10} className='animate-spin' /> : <RefreshCw size={10} />}
							Refresh
						</button>
						<button
							type='button'
							onClick={() => setDismissed(true)}
							className='p-1 rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
						>
							<X size={13} />
						</button>
					</div>
				</div>

				{/* Horizontal scroll of cards */}
				<div className='flex gap-3 overflow-x-auto pb-1 no-scrollbar'>
					{data.recommendations.map((rec, i) => (
						<RecCard key={rec.listing_id} rec={rec} index={i} />
					))}
				</div>

				{/* Bottom row: sustainability tip + trending */}
				<div className='flex flex-col gap-2 sm:flex-row sm:gap-3'>
					{data.sustainability_tip && (
						<div className='flex items-start gap-2 flex-1 px-3 py-2.5 rounded-[var(--radius-lg)] bg-emerald-50 border border-emerald-100'>
							<Leaf size={13} className='text-emerald-600 flex-shrink-0 mt-0.5' />
							<p className='text-[11px] text-emerald-700 leading-relaxed'>{data.sustainability_tip}</p>
						</div>
					)}
					{data.trending_picks.length > 0 && (
						<div className='flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)] border border-[var(--color-border)]'>
							<TrendingUp size={13} className='text-[var(--color-brand-accent)] flex-shrink-0 mt-0.5' />
							<div className='min-w-0'>
								<p className='text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1'>Trending now</p>
								<div className='flex flex-wrap gap-1'>
									{data.trending_picks.map((t) => (
										<span key={t} className='text-[10px] font-medium text-[var(--color-text-secondary)]'>
											{t}
										</span>
									))}
								</div>
							</div>
						</div>
					)}
				</div>
			</motion.div>
		</AnimatePresence>
	)
}
