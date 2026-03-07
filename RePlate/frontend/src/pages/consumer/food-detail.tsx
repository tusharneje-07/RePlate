import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	ArrowLeft,
	Heart,
	Share2,
	MapPin,
	Clock,
	Leaf,
	Star,
	ShoppingCart,
	ChevronLeft,
	ChevronRight,
	Minus,
	Plus,
	AlertTriangle,
	Package,
	CalendarCheck,
	CalendarX,
	Thermometer,
	Loader2,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Rating } from '@/components/common/rating'
import { useCartStore } from '@/stores/cart-store'
import { listingsApi, favoritesApi } from '@/lib/api'
import { mapListingToFoodItem } from '@/lib/mappers'
import { formatCurrency, formatDistance, calculateDiscount } from '@/lib/utils'
import { slideUp, staggerContainer } from '@/lib/motion'

export function FoodDetailPage() {
	const { foodId } = useParams<{ foodId: string }>()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const { addItem, items, updateQuantity } = useCartStore()

	const { data: listing, isLoading } = useQuery({
		queryKey: ['listing', foodId],
		queryFn: () => listingsApi.getById(foodId!).then((r) => r.data),
		enabled: !!foodId,
	})

	const food = listing ? mapListingToFoodItem(listing) : null

	const [imgIdx, setImgIdx] = useState(0)
	const [qty, setQty] = useState(1)
	const [favorited, setFavorited] = useState<boolean | null>(null)

	// Sync favorited state from listing once loaded
	const effectiveFavorited = favorited !== null ? favorited : (food?.isFavorited ?? false)

	const toggleFavMutation = useMutation({
		mutationFn: async () => {
			if (effectiveFavorited) {
				await favoritesApi.removeFoodByListingId(foodId!)
			} else {
				await favoritesApi.add({ favorite_type: 'food', food_listing_id: foodId })
			}
		},
		onMutate: () => setFavorited(!effectiveFavorited),
		onError: () => setFavorited(effectiveFavorited), // rollback
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
	})

	if (isLoading) {
		return (
			<div className='flex items-center justify-center py-24'>
				<Loader2 size={32} className='animate-spin text-[var(--color-brand-accent)]' />
			</div>
		)
	}

	if (!food) {
		return (
			<div className='flex flex-col items-center justify-center py-24 text-center'>
				<div className='w-20 h-20 rounded-full bg-[var(--color-brand-accent-light)] flex items-center justify-center mb-4'>
					<Package size={36} className='text-[var(--color-brand-accent)]' />
				</div>
				<h2 className='text-xl font-bold font-[var(--font-display)]'>Food not found</h2>
				<p className='text-[var(--color-text-muted)] mt-2 mb-6'>This item may no longer be available.</p>
				<Button onClick={() => navigate('/consumer/browse')}>Browse Deals</Button>
			</div>
		)
	}

	const discount = calculateDiscount(food.originalPrice, food.discountedPrice)
	const cartItem = items.find((i) => i.foodItem.id === food.id)
	const pickupEnd = food.pickupEnd ? new Date(food.pickupEnd) : null
	const pickupStart = food.pickupStart ? new Date(food.pickupStart) : null
	const minsLeft = pickupEnd ? Math.floor((pickupEnd.getTime() - Date.now()) / 60000) : null
	const isUrgent = minsLeft !== null && minsLeft > 0 && minsLeft < 90

	function handleAddToCart() {
		if (!food) return
		if (cartItem) {
			updateQuantity(cartItem.id, cartItem.quantity + qty)
		} else {
			addItem(food, qty)
		}
		navigate('/consumer/cart')
	}

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='max-w-2xl mx-auto'
		>
			{/* ── Back + Actions ── */}
			<motion.div variants={slideUp} className='flex items-center justify-between mb-4'>
				<button
					type='button'
					onClick={() => navigate(-1)}
					className='flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-brand-accent)] transition-colors'
				>
					<ArrowLeft size={16} />
					Back
				</button>
				<div className='flex items-center gap-2'>
					<button
						type='button'
						onClick={() => toggleFavMutation.mutate()}
						disabled={toggleFavMutation.isPending}
						className='p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-rose-300 hover:text-rose-500 transition-colors'
					>
						<Heart size={16} className={effectiveFavorited ? 'fill-rose-500 text-rose-500' : ''} />
					</button>
					<button
						type='button'
						className='p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-brand-accent)] transition-colors'
					>
						<Share2 size={16} />
					</button>
				</div>
			</motion.div>

			{/* ── Image Gallery ── */}
			<motion.div variants={slideUp} className='relative rounded-[var(--radius-xl)] overflow-hidden aspect-[4/3] mb-4 bg-[var(--color-border-subtle)]'>
				<img
					src={food.images[imgIdx]}
					alt={food.name}
					className='w-full h-full object-cover'
				/>

				{/* Discount badge */}
				<span className='absolute top-3 left-3 bg-[var(--color-brand-accent)] text-white text-sm font-bold px-3 py-1 rounded-full shadow'>
					-{discount}%
				</span>

				{/* Status */}
				{food.status === 'low-stock' && (
					<span className='absolute top-3 right-3 bg-[var(--color-warning-light)] text-[var(--color-warning)] text-xs font-semibold px-2.5 py-1 rounded-full'>
						Only {food.quantityAvailable} left!
					</span>
				)}

				{/* Gallery nav */}
				{food.images.length > 1 && (
					<>
						<button
							type='button'
							onClick={() => setImgIdx((p) => (p - 1 + food.images.length) % food.images.length)}
							className='absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors'
						>
							<ChevronLeft size={16} />
						</button>
						<button
							type='button'
							onClick={() => setImgIdx((p) => (p + 1) % food.images.length)}
							className='absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors'
						>
							<ChevronRight size={16} />
						</button>
						<div className='absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1'>
							{food.images.map((_, i) => (
								<button
									key={i}
									type='button'
									onClick={() => setImgIdx(i)}
									className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/50'}`}
								/>
							))}
						</div>
					</>
				)}
			</motion.div>

			{/* ── Seller Row ── */}
			<motion.div variants={slideUp} className='flex items-center gap-3 mb-4'>
				<Link to={`/consumer/browse?seller=${food.seller.id}`} className='flex items-center gap-2.5 group'>
					<div className='w-10 h-10 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-elevated)]'>
						{food.seller.logo && (
							<img src={food.seller.logo} alt={food.seller.name} className='w-full h-full object-cover' />
						)}
					</div>
					<div>
						<p className='text-sm font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-accent)] transition-colors'>
							{food.seller.name}
						</p>
						<div className='flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]'>
							<MapPin size={10} />
							{food.seller.address}
							{food.seller.distance && ` · ${formatDistance(food.seller.distance)}`}
						</div>
					</div>
				</Link>
				<div className='ml-auto flex-shrink-0'>
					<Rating value={food.seller.rating} />
				</div>
			</motion.div>

			<Separator className='mb-4' />

			{/* ── Food Info ── */}
			<motion.div variants={slideUp} className='space-y-3 mb-4'>
				<div className='flex items-start justify-between gap-3'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)] leading-tight'>
						{food.name}
					</h1>
					{food.rating && (
						<Rating value={food.rating} reviewCount={food.reviewCount} />
					)}
				</div>

				<p className='text-sm text-[var(--color-text-secondary)] leading-relaxed'>
					{food.description}
				</p>

				{/* Tags */}
				<div className='flex flex-wrap gap-1.5'>
					{food.dietaryTags.map((tag) => (
						<Badge key={tag} variant='eco' className='capitalize'>
							{tag}
						</Badge>
					))}
					{food.allergens.length > 0 && (
						<Badge variant='warning' className='gap-1'>
							<AlertTriangle size={10} />
							Contains: {food.allergens.join(', ')}
						</Badge>
					)}
				</div>
			</motion.div>

		{/* ── Pickup Info Grid ── */}
		<motion.div
			variants={slideUp}
			className='grid grid-cols-2 gap-3 mb-4'
		>
			{[
				{
					icon: Clock,
					label: 'Pickup Window',
					value: pickupStart && pickupEnd
						? `${pickupStart.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })} – ${pickupEnd.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
						: 'See store hours',
					color: isUrgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-primary)]',
				},
				{
					icon: Package,
					label: 'Available',
					value: `${food.quantityAvailable} ${food.unit}${food.quantityAvailable > 1 ? 's' : ''}`,
					color: 'text-[var(--color-text-primary)]',
				},
				{
					icon: Leaf,
					label: 'CO₂ Saved',
					value: `${food.co2SavedKg} kg`,
					color: 'text-[var(--color-eco)]',
				},
				{
					icon: MapPin,
					label: 'Location',
					value: food.seller.distance ? formatDistance(food.seller.distance) : food.seller.address,
					color: 'text-[var(--color-text-primary)]',
				},
			].map(({ icon: Icon, label, value, color }) => (
				<div
					key={label}
					className='flex items-center gap-2.5 p-3 bg-[var(--color-surface-elevated)] rounded-[var(--radius-md)]'
				>
					<Icon size={16} className={color} />
					<div className='min-w-0'>
						<p className='text-[10px] text-[var(--color-text-muted)]'>{label}</p>
						<p className={`text-xs font-semibold ${color} truncate`}>{value}</p>
					</div>
				</div>
			))}
		</motion.div>

		{/* ── Full Freshness Details ── */}
		<motion.div
			variants={slideUp}
			className='bg-[var(--color-surface-elevated)] rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] p-3.5 mb-4'
		>
			<p className='text-xs font-semibold text-[var(--color-text-primary)] mb-2.5'>Freshness Details</p>
			<div className='space-y-2'>
				{food.manufacturedAt && (
					<div className='flex items-center justify-between text-xs'>
						<div className='flex items-center gap-1.5 text-[var(--color-text-muted)]'>
							<CalendarCheck size={13} className='text-[var(--color-success)]' />
							<span>Manufactured</span>
						</div>
						<span className='font-medium text-[var(--color-text-primary)]'>
							{new Date(food.manufacturedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
							{' · '}
							{new Date(food.manufacturedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
						</span>
					</div>
				)}
				<div className='flex items-center justify-between text-xs'>
					<div className='flex items-center gap-1.5 text-[var(--color-text-muted)]'>
						<CalendarX size={13} className={isUrgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-muted)]'} />
						<span>Best Before</span>
					</div>
					<span className={`font-medium ${isUrgent ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-primary)]'}`}>
						{new Date(food.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
						{' · '}
						{new Date(food.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
					</span>
				</div>
				<div className='flex items-center justify-between text-xs'>
					<div className='flex items-center gap-1.5 text-[var(--color-text-muted)]'>
						<Thermometer size={13} className='text-[var(--color-info)]' />
						<span>Storage</span>
					</div>
					<span className='font-medium text-[var(--color-text-primary)]'>Refrigerated</span>
				</div>
			</div>
		</motion.div>

			<Separator className='mb-4' />

			{/* ── Price + Quantity + CTA ── */}
			<motion.div variants={slideUp} className='sticky bottom-20 lg:static bg-[var(--color-surface-elevated)] lg:bg-transparent rounded-[var(--radius-xl)] lg:rounded-none p-4 lg:p-0 border border-[var(--color-border)] lg:border-none shadow-[var(--shadow-elevated)] lg:shadow-none'>
				<div className='flex items-center justify-between gap-4'>
					{/* Price */}
					<div>
						<div className='flex items-baseline gap-2'>
							<span className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-brand-accent)]'>
								{formatCurrency(food.discountedPrice)}
							</span>
							<span className='text-sm text-[var(--color-text-muted)] line-through'>
								{formatCurrency(food.originalPrice)}
							</span>
						</div>
						<p className='text-xs text-[var(--color-success)] font-medium mt-0.5'>
							Save {formatCurrency(food.originalPrice - food.discountedPrice)} per {food.unit}
						</p>
					</div>

					{/* Qty + CTA */}
					<div className='flex items-center gap-2'>
						<div className='flex items-center gap-1.5 border border-[var(--color-border)] rounded-[var(--radius-md)] p-1'>
							<button
								type='button'
								onClick={() => setQty((q) => Math.max(1, q - 1))}
								className='w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-accent-light)] hover:text-[var(--color-brand-accent)] transition-colors'
							>
								<Minus size={14} />
							</button>
							<span className='text-sm font-semibold min-w-[20px] text-center'>{qty}</span>
							<button
								type='button'
								onClick={() => setQty((q) => Math.min(food.quantityAvailable, q + 1))}
								className='w-7 h-7 flex items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-accent-light)] hover:text-[var(--color-brand-accent)] transition-colors'
							>
								<Plus size={14} />
							</button>
						</div>
						<Button onClick={handleAddToCart} className='gap-2 h-10 px-4'>
							<ShoppingCart size={16} />
							Add to Cart
						</Button>
					</div>
				</div>
			</motion.div>

			<div className='h-8' />
		</motion.div>
	)
}
