import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Search, Filter, CheckCircle2, ChevronRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { useInspectorStore } from '@/stores/inspector-store'
import { useInspectorUIStore } from '@/stores/inspector-ui-store'

function RiskPill({ level }: { level: 'low' | 'moderate' | 'high' | 'critical' }) {
	const cls = {
		low: 'bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)]',
		moderate: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		high: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		critical: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}
	return <Badge className={`border-none text-[10px] font-bold capitalize hover:opacity-100 ${cls[level]}`}>{level}</Badge>
}

function UrgencyPill({ urgency }: { urgency: string }) {
	const map: Record<string, string> = {
		normal: 'bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-muted)]',
		expiring_12h: 'bg-[var(--color-inspector-risk-moderate-light)] text-[var(--color-inspector-risk-moderate)]',
		expiring_6h: 'bg-[var(--color-inspector-risk-high-light)] text-[var(--color-inspector-risk-high)]',
		expired: 'bg-[var(--color-inspector-risk-critical-light)] text-[var(--color-inspector-risk-critical)]',
	}
	const label = urgency.replace('_', ' ')
	return <Badge className={`border-none text-[10px] font-bold hover:opacity-100 ${map[urgency] ?? map.normal}`}>{label}</Badge>
}

export function InspectorListingsPage() {
	const { listings } = useInspectorStore()
	const { searchQuery, setSearchQuery, filters, updateFilters, resetFilters } = useInspectorUIStore()

	const regions = useMemo(() => ['all', ...Array.from(new Set(listings.map((item) => item.region)))], [listings])

	const filtered = useMemo(() => {
		return listings
			.filter((item) => {
				const q = searchQuery.trim().toLowerCase()
				const matchesQuery =
					!q ||
					item.foodName.toLowerCase().includes(q) ||
					item.sourceName.toLowerCase().includes(q) ||
					item.region.toLowerCase().includes(q)

				const matchesRegion = filters.region === 'all' || item.region === filters.region
				const matchesFood = filters.foodType === 'all' || item.category === filters.foodType
				const matchesUrgency = filters.urgency === 'all' || item.urgency === filters.urgency
				const matchesRating = item.sourceType === 'consumer' || (item.sourceRating ?? 0) >= filters.minSellerRating
				const matchesRiskFlag =
					filters.riskFlag === 'all' || item.riskFlags.some((flag) => flag.includes(filters.riskFlag))

				return matchesQuery && matchesRegion && matchesFood && matchesUrgency && matchesRating && matchesRiskFlag
			})
			.sort((a, b) => {
				const rank = { expired: 4, expiring_6h: 3, expiring_12h: 2, normal: 1 }
				const urgencyDiff = (rank[b.urgency] ?? 0) - (rank[a.urgency] ?? 0)
				if (urgencyDiff !== 0) return urgencyDiff
				return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
			})
	}, [filters, listings, searchQuery])

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-7xl mx-auto'>
			<motion.div variants={slideUp} className='flex flex-col gap-1'>
				<p className='text-sm text-[var(--color-inspector-text-muted)]'>Verification Queue</p>
				<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Listing Safety Monitoring</h1>
			</motion.div>

			<motion.div variants={slideUp} className='rounded-[var(--radius-xl)] border border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] p-3 md:p-4 space-y-3'>
				<div className='relative'>
					<Search className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-inspector-text-muted)]' />
					<Input
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						placeholder='Search by food, source, or region...'
						className='pl-9 bg-[var(--color-inspector-surface-elevated)] border-[var(--color-inspector-border-subtle)]'
					/>
				</div>

				<div className='grid grid-cols-2 md:grid-cols-5 gap-2'>
					<select
						value={filters.region}
						onChange={(event) => updateFilters({ region: event.target.value })}
						className='h-10 rounded-[var(--radius-md)] border border-[var(--color-inspector-border)] bg-white px-2.5 text-xs text-[var(--color-inspector-text-secondary)]'
					>
						{regions.map((region) => (
							<option key={region} value={region}>{region === 'all' ? 'All Regions' : region}</option>
						))}
					</select>
					<select
						value={filters.foodType}
						onChange={(event) => updateFilters({ foodType: event.target.value })}
						className='h-10 rounded-[var(--radius-md)] border border-[var(--color-inspector-border)] bg-white px-2.5 text-xs text-[var(--color-inspector-text-secondary)]'
					>
						<option value='all'>All Food Types</option>
						<option value='bakery'>Bakery</option>
						<option value='restaurant'>Restaurant</option>
						<option value='meals'>Meals</option>
						<option value='vegetables'>Vegetables</option>
					</select>
					<select
						value={filters.urgency}
						onChange={(event) => updateFilters({ urgency: event.target.value })}
						className='h-10 rounded-[var(--radius-md)] border border-[var(--color-inspector-border)] bg-white px-2.5 text-xs text-[var(--color-inspector-text-secondary)]'
					>
						<option value='all'>All Urgency</option>
						<option value='expiring_12h'>Expires in 12h</option>
						<option value='expiring_6h'>Expires in 6h</option>
						<option value='expired'>Expired</option>
					</select>
					<select
						value={String(filters.minSellerRating)}
						onChange={(event) => updateFilters({ minSellerRating: Number(event.target.value) })}
						className='h-10 rounded-[var(--radius-md)] border border-[var(--color-inspector-border)] bg-white px-2.5 text-xs text-[var(--color-inspector-text-secondary)]'
					>
						<option value='0'>Seller Rating: Any</option>
						<option value='3'>Seller Rating: 3+</option>
						<option value='4'>Seller Rating: 4+</option>
						<option value='4.5'>Seller Rating: 4.5+</option>
					</select>
					<div className='flex gap-2'>
						<select
							value={filters.riskFlag}
							onChange={(event) => updateFilters({ riskFlag: event.target.value })}
							className='h-10 flex-1 rounded-[var(--radius-md)] border border-[var(--color-inspector-border)] bg-white px-2.5 text-xs text-[var(--color-inspector-text-secondary)]'
						>
							<option value='all'>All Risk Flags</option>
							<option value='expiry'>Expiry</option>
							<option value='storage'>Storage</option>
							<option value='complaint'>Complaints</option>
						</select>
						<Button variant='outline' onClick={resetFilters} className='h-10 px-3 border-[var(--color-inspector-border)] text-[var(--color-inspector-text-secondary)]'>
							<Filter className='w-4 h-4 mr-1' /> Reset
						</Button>
					</div>
				</div>
			</motion.div>

			<motion.div variants={staggerContainer} className='space-y-3'>
				{filtered.length === 0 ? (
					<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
						<CardContent className='p-6 text-center'>
							<p className='text-sm text-[var(--color-inspector-text-muted)]'>No listings matched your filters.</p>
						</CardContent>
					</Card>
				) : (
					filtered.map((item) => (
						<motion.div key={item.id} variants={slideUp}>
							<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
								<CardContent className='p-4'>
									<div className='flex flex-col md:flex-row md:items-start md:justify-between gap-3'>
										<div className='min-w-0'>
											<div className='flex items-center flex-wrap gap-2 mb-1'>
												<p className='text-base font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] truncate'>{item.foodName}</p>
												<RiskPill level={item.riskLevel} />
												<UrgencyPill urgency={item.urgency} />
											</div>
											<p className='text-xs text-[var(--color-inspector-text-muted)]'>
												{item.sourceName} · {item.sourceType} · {item.region}
											</p>
											<p className='text-xs text-[var(--color-inspector-text-secondary)] mt-1'>
												Qty: {item.quantityKg}kg · Expires {formatRelativeTime(new Date(item.expiresAt))}
											</p>
											<div className='flex flex-wrap gap-1.5 mt-2'>
												{item.riskFlags.slice(0, 3).map((flag) => (
													<Badge key={flag} className='text-[10px] font-medium bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] border border-[var(--color-inspector-border-subtle)] hover:bg-[var(--color-inspector-surface-elevated)]'>
														{flag.replace(/_/g, ' ')}
													</Badge>
												))}
											</div>
										</div>

										<div className='flex items-center gap-2 md:ml-4'>
											{item.status === 'approved' ? (
												<Button size='sm' disabled className='bg-[var(--color-inspector-risk-low)] text-white h-9'>
													<CheckCircle2 className='w-4 h-4 mr-1' /> Approved
												</Button>
											) : (
												<Button asChild size='sm' className='bg-[var(--color-inspector-accent)] hover:bg-[var(--color-inspector-accent-hover)] text-white h-9'>
													<Link to={`/inspector/listings/${item.id}`}>Take Action <ChevronRight className='w-4 h-4 ml-1' /></Link>
												</Button>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</motion.div>
					))
				)}
			</motion.div>
		</motion.div>
	)
}
