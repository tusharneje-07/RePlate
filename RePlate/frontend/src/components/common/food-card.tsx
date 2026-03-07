import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	Clock,
	MapPin,
	Leaf,
	Heart,
	ShoppingCart,
	Timer,
	Star,
	CalendarCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency, formatDistance } from '@/lib/utils'
import { cardHover } from '@/lib/motion'
import { useCartStore } from '@/stores/cart-store'
import type { FoodItem } from '@/types'

interface FoodCardProps {
	food: FoodItem
	layout?: 'grid' | 'list'
	onFavoriteToggle?: () => void
}

// ── Helpers ────────────────────────────────────────────────

function getExpiryLabel(expiresAt: string): { label: string; urgent: boolean } {
	const diffMs = new Date(expiresAt).getTime() - Date.now()
	if (diffMs <= 0) return { label: 'Expired', urgent: true }
	const mins = Math.floor(diffMs / 60000)
	const hrs = Math.floor(mins / 60)
	if (mins < 60) return { label: `${mins}m left`, urgent: true }
	if (hrs < 4) return { label: `${hrs}h left`, urgent: true }
	return { label: `${hrs}h left`, urgent: false }
}

function getPickupLabel(pickupStart: string | null, pickupEnd: string | null): string {
	if (!pickupStart || !pickupEnd) return 'See store hours'
	const fmt = (d: Date) =>
		d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
	return `${fmt(new Date(pickupStart))} – ${fmt(new Date(pickupEnd))}`
}

function getPreparedLabel(manufacturedAt?: string): string {
	if (!manufacturedAt) return 'Today'
	const diffMs = Date.now() - new Date(manufacturedAt).getTime()
	const hrs = Math.floor(diffMs / 3600000)
	if (hrs < 1) return 'Just now'
	if (hrs < 6) return 'Today'
	if (hrs < 30) return 'Today'
	return 'Yesterday'
}

// ── VegDot ─────────────────────────────────────────────────

const VEG_COLORS: Record<string, { dot: string; border: string; text: string }> = {
	veg: {
		dot: 'bg-[var(--color-success)]',
		border: 'border-[var(--color-success)]',
		text: 'text-[var(--color-success)]',
	},
	vegan: {
		dot: 'bg-emerald-600',
		border: 'border-emerald-600',
		text: 'text-emerald-600',
	},
	'non-veg': {
		dot: 'bg-red-500',
		border: 'border-red-500',
		text: 'text-red-500',
	},
}

function VegDot({ tag }: { tag: string }) {
	const c = VEG_COLORS[tag] ?? { dot: 'bg-gray-400', border: 'border-gray-400', text: 'text-gray-400' }
	const label = tag === 'non-veg' ? 'Non-Veg' : tag.charAt(0).toUpperCase() + tag.slice(1)
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5',
				c.border,
				c.text,
			)}
		>
			<span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.dot)} />
			{label}
		</span>
	)
}

// ── FoodCard ───────────────────────────────────────────────

export function FoodCard({ food, layout = 'grid', onFavoriteToggle }: FoodCardProps) {
	const { addItem, items } = useCartStore()
	const inCart = items.some((i) => i.foodItem.id === food.id)
	const expiry = getExpiryLabel(food.expiresAt)
	const pickupLabel = getPickupLabel(food.pickupStart, food.pickupEnd)
	const preparedLabel = getPreparedLabel(food.manufacturedAt)
	const isLowStock = food.status === 'low-stock' || food.quantityAvailable <= 3

	const primaryDietTag = food.dietaryTags[0]

	// ── List layout ──
	if (layout === 'list') {
		return (
			<motion.div
				variants={cardHover}
				initial='rest'
				whileHover='hover'
				className='group flex gap-3 p-3 bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				{/* Thumbnail */}
				<Link to={`/consumer/food/${food.id}`} className='flex-shrink-0'>
					<div className='relative w-24 h-24 rounded-[var(--radius-md)] overflow-hidden bg-[var(--color-border-subtle)]'>
						<img
							src={food.images[0]}
							alt={food.name}
							className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
						/>
						<span className='absolute top-1.5 left-1.5 bg-[var(--color-brand-accent)] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full'>
							-{food.discountPercent}%
						</span>
					</div>
				</Link>

				{/* Details */}
				<div className='flex-1 min-w-0 flex flex-col justify-between'>
					<div>
						<div className='flex items-start justify-between gap-2'>
							<Link to={`/consumer/food/${food.id}`}>
								<h3 className='font-semibold text-sm text-[var(--color-text-primary)] leading-tight line-clamp-1 hover:text-[var(--color-brand-accent)] transition-colors'>
									{food.name}
								</h3>
							</Link>
						<button
							type='button'
							onClick={onFavoriteToggle}
							className='flex-shrink-0 text-[var(--color-text-muted)] hover:text-rose-500 transition-colors'
						>
							<Heart size={14} className={cn(food.isFavorited && 'fill-rose-500 text-rose-500')} />
						</button>
						</div>
						<p className='text-[11px] text-[var(--color-text-muted)] mt-0.5'>{food.seller.name}</p>
						<div className='flex items-center gap-2 mt-1'>
							{primaryDietTag && <VegDot tag={primaryDietTag} />}
							<span
								className={cn(
									'flex items-center gap-0.5 text-[10px] font-medium',
									expiry.urgent ? 'text-amber-500' : 'text-[var(--color-text-muted)]',
								)}
							>
								<Timer size={10} />
								{expiry.label}
							</span>
						</div>
					</div>

					<div className='flex items-end justify-between mt-2'>
						<div>
							<div className='flex items-baseline gap-1.5'>
								<span className='text-base font-bold text-[var(--color-brand-accent)]'>
									{formatCurrency(food.discountedPrice)}
								</span>
								<span className='text-xs text-[var(--color-text-muted)] line-through'>
									{formatCurrency(food.originalPrice)}
								</span>
							</div>
							<div className='flex items-center gap-2 mt-0.5'>
								<span className='flex items-center gap-0.5 text-[10px] text-[var(--color-success)]'>
									<Leaf size={10} />
									{food.co2SavedKg}kg CO₂
								</span>
								{food.seller.distance !== undefined && (
									<span className='flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)]'>
										<MapPin size={10} />
										{formatDistance(food.seller.distance)}
									</span>
								)}
							</div>
						</div>
						<Button
							size='icon-sm'
							onClick={() => addItem(food)}
							variant={inCart ? 'secondary' : 'default'}
							className='flex-shrink-0'
						>
							<ShoppingCart size={14} />
						</Button>
					</div>
				</div>
			</motion.div>
		)
	}

	// ── Grid layout ──
	return (
		<motion.div
			variants={cardHover}
			initial='rest'
			whileHover='hover'
			className='group flex flex-col bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
		>
			{/* ── Image block ── */}
			<Link to={`/consumer/food/${food.id}`} className='block relative'>
				<div className='aspect-[4/3] overflow-hidden bg-[var(--color-border-subtle)]'>
					<img
						src={food.images[0]}
						alt={food.name}
						className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
					/>
					{/* Gradient overlay */}
					<div className='absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none' />
				</div>

				{/* Discount badge — top left */}
				<span className='absolute top-2.5 left-2.5 bg-[var(--color-brand-accent)] text-white text-xs font-bold px-2 py-0.5 rounded-full shadow'>
					-{food.discountPercent}%
				</span>

				{/* Low stock — top right (behind heart) */}
				{isLowStock && (
					<span className='absolute top-2.5 right-9 bg-amber-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow'>
						{food.quantityAvailable} left
					</span>
				)}

			{/* Heart — top right */}
			<button
				type='button'
				onClick={onFavoriteToggle}
				className='absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow text-[var(--color-text-muted)] hover:text-rose-500 transition-colors'
			>
				<Heart size={14} className={cn(food.isFavorited && 'fill-rose-500 text-rose-500')} />
			</button>

				{/* Expiry strip — bottom of image */}
				<div
					className={cn(
						'absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-2.5 py-1.5',
						expiry.urgent ? 'bg-amber-500/90' : 'bg-black/55',
					)}
				>
					<Timer size={11} className='text-white flex-shrink-0' />
					<span className='text-white text-[11px] font-semibold truncate'>
						Expires in {expiry.label}
					</span>
				</div>
			</Link>

			{/* ── Body ── */}
			<div className='flex flex-col flex-1 p-3'>
				{/* Seller + distance */}
				<div className='flex items-center gap-1 mb-1'>
					<span className='text-[11px] text-[var(--color-text-muted)] truncate flex-1 leading-none'>
						{food.seller.name}
					</span>
					{food.seller.distance !== undefined && (
						<span className='flex items-center gap-0.5 text-[10px] text-[var(--color-text-muted)] flex-shrink-0'>
							<MapPin size={9} />
							{formatDistance(food.seller.distance)}
						</span>
					)}
				</div>

				{/* Food name */}
				<Link to={`/consumer/food/${food.id}`}>
					<h3 className='font-semibold text-sm text-[var(--color-text-primary)] leading-snug line-clamp-2 hover:text-[var(--color-brand-accent)] transition-colors mb-2'>
						{food.name}
					</h3>
				</Link>

				{/* Rating row */}
				{food.rating !== undefined && (
					<div className='flex items-center gap-1 mb-2'>
						<Star size={11} className='text-amber-400 fill-amber-400 flex-shrink-0' />
						<span className='text-xs font-semibold text-[var(--color-text-primary)]'>
							{food.rating.toFixed(1)}
						</span>
						{food.reviewCount !== undefined && (
							<span className='text-[10px] text-[var(--color-text-muted)]'>({food.reviewCount})</span>
						)}
						{primaryDietTag && (
							<span className='ml-auto'>
								<VegDot tag={primaryDietTag} />
							</span>
						)}
					</div>
				)}

				{/* 4-cell info grid: Pickup Window | Available | CO₂ | Prepared */}
				<div className='grid grid-cols-2 gap-x-2 gap-y-1.5 mb-3'>
					{/* Pickup window */}
					<div className='flex items-center gap-1'>
						<Clock size={11} className='text-[var(--color-brand-accent)] flex-shrink-0' />
						<div className='min-w-0'>
							<p className='text-[9px] text-[var(--color-text-muted)] leading-none'>Pickup</p>
							<p className='text-[10px] font-semibold text-[var(--color-text-primary)] truncate leading-tight'>
								{pickupLabel}
							</p>
						</div>
					</div>

					{/* Quantity available */}
					<div className='flex items-center gap-1'>
						<span className='w-2.5 h-2.5 rounded-sm border border-[var(--color-text-muted)] flex-shrink-0' />
						<div className='min-w-0'>
							<p className='text-[9px] text-[var(--color-text-muted)] leading-none'>Available</p>
							<p className='text-[10px] font-semibold text-[var(--color-text-primary)] leading-tight'>
								{food.quantityAvailable} {food.unit}s
							</p>
						</div>
					</div>

					{/* CO₂ saved */}
					<div className='flex items-center gap-1'>
						<Leaf size={11} className='text-[var(--color-eco)] flex-shrink-0' />
						<div className='min-w-0'>
							<p className='text-[9px] text-[var(--color-text-muted)] leading-none'>CO₂ Saved</p>
							<p className='text-[10px] font-semibold text-[var(--color-eco)] leading-tight'>
								{food.co2SavedKg} kg
							</p>
						</div>
					</div>

					{/* Prepared */}
					<div className='flex items-center gap-1'>
						<CalendarCheck size={11} className='text-[var(--color-text-muted)] flex-shrink-0' />
						<div className='min-w-0'>
							<p className='text-[9px] text-[var(--color-text-muted)] leading-none'>Prepared</p>
							<p className='text-[10px] font-semibold text-[var(--color-text-primary)] leading-tight'>
								{preparedLabel}
							</p>
						</div>
					</div>
				</div>

				{/* Price + CTA */}
				<div className='mt-auto'>
					<div className='flex items-baseline gap-1.5 mb-2'>
						<span className='text-base font-bold text-[var(--color-brand-accent)]'>
							{formatCurrency(food.discountedPrice)}
						</span>
						<span className='text-xs text-[var(--color-text-muted)] line-through'>
							{formatCurrency(food.originalPrice)}
						</span>
						<span className='ml-auto text-[10px] text-[var(--color-success)] font-medium'>
							Save {formatCurrency(food.originalPrice - food.discountedPrice)}
						</span>
					</div>

					<Button
						size='sm'
						onClick={(e) => {
							e.preventDefault()
							addItem(food)
						}}
						variant={inCart ? 'secondary' : 'default'}
						className='w-full h-8 text-xs gap-1.5'
					>
						<ShoppingCart size={13} />
						{inCart ? 'Added to Cart' : 'Add to Cart'}
					</Button>
				</div>
			</div>
		</motion.div>
	)
}
