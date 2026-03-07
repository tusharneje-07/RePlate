/**
 * DemandForecastCard
 * Seller dashboard widget — calls /api/v1/ai/forecast
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Bot,
	TrendingUp,
	Clock,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	Loader2,
	RefreshCw,
	Zap,
	BarChart2,
	PackageOpen,
	Lightbulb,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { aiApi, type DemandForecastResponse } from '@/lib/api'

// ── helpers ──────────────────────────────────────────────────
function RiskBadge({ hours }: { hours: number }) {
	const cls =
		hours < 3
			? 'bg-[var(--color-error-light)] text-[var(--color-error)]'
			: hours < 8
				? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
				: 'bg-[var(--color-success-light)] text-[var(--color-success)]'
	const label = hours < 3 ? 'Critical' : hours < 8 ? 'At Risk' : 'OK'
	return (
		<span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>
	)
}

export function DemandForecastCard() {
	const [data, setData] = useState<DemandForecastResponse | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [expanded, setExpanded] = useState(false)

	const load = async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await aiApi.getDemandForecast()
			if (res.data.success) {
				setData(res.data.data)
				setExpanded(true)
			} else {
				setError('Agent returned no data.')
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Forecast unavailable.')
		} finally {
			setLoading(false)
		}
	}

	return (
		<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
			<CardContent className='p-0'>
				{/* Header */}
				<div
					className='flex items-center justify-between px-4 py-3 cursor-pointer select-none'
					style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
					onClick={() => data && setExpanded((v) => !v)}
				>
					<div className='flex items-center gap-2.5'>
						<div className='w-8 h-8 rounded-[var(--radius-md)] bg-white/20 flex items-center justify-center'>
							<BarChart2 size={16} className='text-white' />
						</div>
						<div>
							<p className='text-[10px] font-medium text-blue-200'>AI Demand Intelligence</p>
							<h3 className='text-sm font-bold text-white leading-tight'>Demand Forecast</h3>
						</div>
					</div>
					<div className='flex items-center gap-2'>
						{data?.ai_powered && (
							<span className='text-[9px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full'>
								AI
							</span>
						)}
						{data ? (
							expanded ? (
								<ChevronUp size={16} className='text-white/70' />
							) : (
								<ChevronDown size={16} className='text-white/70' />
							)
						) : null}
					</div>
				</div>

				{/* Load button or expanded content */}
				{!data ? (
					<div className='px-4 py-4'>
						<p className='text-xs text-[var(--color-seller-text-muted)] mb-3'>
							AI analyses your last 30 days of orders to surface peak demand hours, waste risks, and restock recommendations.
						</p>
						{error && (
							<p className='text-xs text-[var(--color-error)] flex items-center gap-1.5 mb-2'>
								<AlertTriangle size={12} /> {error}
							</p>
						)}
						<Button
							onClick={load}
							disabled={loading}
							className='w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2'
						>
							{loading ? (
								<><Loader2 size={14} className='animate-spin' /> Analysing orders…</>
							) : (
								<><Bot size={14} /> Generate Forecast</>
							)}
						</Button>
					</div>
				) : (
					<AnimatePresence>
						{expanded && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.25 }}
								className='overflow-hidden'
							>
								<div className='px-4 py-4 space-y-4'>
									{/* Summary */}
									<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed italic'>
										"{data.summary}"
									</p>

									{/* Peak hours + optimal time */}
									<div className='grid grid-cols-2 gap-3'>
										<div className='p-3 rounded-[var(--radius-lg)] bg-blue-50 border border-blue-100'>
											<div className='flex items-center gap-1.5 mb-1.5'>
												<Clock size={12} className='text-blue-600' />
												<p className='text-[10px] font-bold text-blue-700 uppercase tracking-wide'>Peak Hours</p>
											</div>
											<div className='flex flex-wrap gap-1'>
												{data.peak_hours.map((h) => (
													<span key={h} className='text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded'>
														{h}
													</span>
												))}
											</div>
										</div>
										<div className='p-3 rounded-[var(--radius-lg)] bg-green-50 border border-green-100'>
											<div className='flex items-center gap-1.5 mb-1.5'>
												<Zap size={12} className='text-green-600' />
												<p className='text-[10px] font-bold text-green-700 uppercase tracking-wide'>Best Time to List</p>
											</div>
											<p className='text-xs font-semibold text-green-700'>{data.optimal_listing_time}</p>
										</div>
									</div>

									{/* Top categories */}
									<div>
										<p className='text-[10px] font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1'>
											<TrendingUp size={11} /> Top Demand Categories
										</p>
										<div className='flex flex-wrap gap-1.5'>
											{data.top_demand_categories.map((cat, i) => (
												<span
													key={cat}
													className='text-xs font-semibold px-2.5 py-1 rounded-full border'
													style={{
														background: i === 0 ? 'var(--color-seller-accent-light)' : 'var(--color-seller-surface-elevated)',
														color: i === 0 ? 'var(--color-seller-accent)' : 'var(--color-seller-text-secondary)',
														borderColor: i === 0 ? 'var(--color-seller-accent-muted)' : 'var(--color-seller-border)',
													}}
												>
													{i === 0 ? '🔥 ' : ''}{cat}
												</span>
											))}
										</div>
									</div>

									{/* Waste risk alerts */}
									{data.waste_risk_alerts.length > 0 && (
										<div>
											<p className='text-[10px] font-bold text-[var(--color-error)] uppercase tracking-wide mb-2 flex items-center gap-1'>
												<AlertTriangle size={11} /> Waste Risk Alerts
											</p>
											<div className='space-y-2'>
												{data.waste_risk_alerts.map((alert) => (
													<div
														key={alert.listing_id}
														className='flex items-center gap-3 p-2.5 rounded-[var(--radius-md)] bg-[var(--color-error-light)] border border-[var(--color-error)]/20'
													>
														<PackageOpen size={14} className='text-[var(--color-error)] flex-shrink-0' />
														<div className='flex-1 min-w-0'>
															<p className='text-xs font-semibold text-[var(--color-error)] truncate'>{alert.title}</p>
															<p className='text-[10px] text-[var(--color-error)]/70'>
																{alert.quantity_remaining} left · {formatCurrency(alert.current_price)} · {alert.expiry_hours.toFixed(1)}h left
															</p>
														</div>
														<RiskBadge hours={alert.expiry_hours} />
													</div>
												))}
											</div>
											{data.waste_risk_action && (
												<p className='text-[11px] text-[var(--color-error)] mt-2 flex items-start gap-1.5'>
													<Lightbulb size={11} className='flex-shrink-0 mt-0.5' /> {data.waste_risk_action}
												</p>
											)}
										</div>
									)}

									{/* Restock recs */}
									{data.restock_recommendations.length > 0 && (
										<div>
											<p className='text-[10px] font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-2 flex items-center gap-1'>
												<Lightbulb size={11} /> Restock Recommendations
											</p>
											<ul className='space-y-1'>
												{data.restock_recommendations.map((r, i) => (
													<li key={i} className='text-xs text-[var(--color-seller-text-secondary)] flex items-start gap-1.5'>
														<span className='text-[var(--color-seller-accent)] font-bold mt-0.5'>·</span> {r}
													</li>
												))}
											</ul>
										</div>
									)}

									{/* Weekly forecast */}
									<div className='p-3 rounded-[var(--radius-lg)] bg-[var(--color-seller-surface-elevated)] border border-[var(--color-seller-border-subtle)]'>
										<p className='text-[10px] font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-1'>Weekly Outlook</p>
										<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>{data.weekly_forecast}</p>
									</div>

									{/* Footer */}
									<div className='flex items-center justify-between text-[10px] text-[var(--color-seller-text-muted)]'>
										<span>Based on {data.total_orders_30d} orders (30 days)</span>
										<button
											type='button'
											onClick={load}
											disabled={loading}
											className='flex items-center gap-1 text-[var(--color-seller-accent)] hover:underline'
										>
											{loading ? <Loader2 size={10} className='animate-spin' /> : <RefreshCw size={10} />}
											Refresh
										</button>
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				)}
			</CardContent>
		</Card>
	)
}
