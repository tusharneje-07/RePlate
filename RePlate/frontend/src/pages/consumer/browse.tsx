import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SlidersHorizontal, LayoutGrid, List, SearchX, Loader2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FoodCard } from '@/components/common/food-card'
import { SearchBar } from '@/components/common/search-bar'
import { CategoryTabs } from '@/components/common/category-tabs'
import { FilterPanel } from '@/components/common/filter-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, fadeIn, slideDown } from '@/lib/motion'
import { useUIStore } from '@/stores/ui-store'
import { useLocationStore } from '@/stores/location-store'
import { listingsApi, favoritesApi } from '@/lib/api'
import { mapListingToFoodItem } from '@/lib/mappers'
import type { FoodFilters, FoodItem } from '@/types'
import { cn } from '@/lib/utils'
import { AIRecommendations } from '@/components/ai/AIRecommendations'

export function BrowsePage() {
	const [category, setCategory] = useState('all')
	const [filters, setFilters] = useState<FoodFilters>({})
	const [layout, setLayout] = useState<'grid' | 'list'>('grid')
	const [showFilters, setShowFilters] = useState(false)
	const { searchQuery } = useUIStore()
	const { location, discoveryRadiusMeters } = useLocationStore()
	const queryClient = useQueryClient()

	const { data: listings = [], isLoading } = useQuery({
		queryKey: ['listings', 'browse', location?.lat, location?.lng, discoveryRadiusMeters, filters.maxDistance],
		queryFn: () =>
			listingsApi
				.browse({
					lat: location?.lat,
					lng: location?.lng,
					radius_km: (filters.maxDistance ?? discoveryRadiusMeters) / 1000,
				})
				.then((r) => r.data),
	})

	const foodItems = listings
		.map(mapListingToFoodItem)
		.filter((food) => new Date(food.expiresAt).getTime() > Date.now())

	const favMutation = useMutation({
		mutationFn: async (food: FoodItem) => {
			if (food.isFavorited) {
				await favoritesApi.removeFoodByListingId(food.id)
			} else {
				await favoritesApi.add({ favorite_type: 'food', food_listing_id: food.id })
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['listings'] })
			queryClient.invalidateQueries({ queryKey: ['favorites'] })
		},
	})

	const filtered = foodItems.filter((food) => {
		if (category !== 'all' && food.category !== category) return false
		if (
			searchQuery &&
			!food.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
			!food.seller.name.toLowerCase().includes(searchQuery.toLowerCase())
		)
			return false
		if (
			filters.categories &&
			filters.categories.length > 0 &&
			!filters.categories.includes(food.category)
		)
			return false
		if (
			filters.dietaryTags &&
			filters.dietaryTags.length > 0 &&
			!filters.dietaryTags.some((t) => food.dietaryTags.includes(t))
		)
			return false
		if (
			filters.maxDistance !== undefined &&
			food.seller.distance !== undefined &&
			food.seller.distance > filters.maxDistance
		)
			return false
		if (filters.maxPrice !== undefined && food.discountedPrice > filters.maxPrice)
			return false
		if (
			filters.minDiscount !== undefined &&
			food.discountPercent < filters.minDiscount
		)
			return false
		return true
	})

	// Sort
	if (filters.sortBy) {
		filtered.sort((a, b) => {
			switch (filters.sortBy) {
				case 'price':
					return a.discountedPrice - b.discountedPrice
				case 'discount':
					return b.discountPercent - a.discountPercent
				case 'distance':
					return (a.seller.distance ?? 0) - (b.seller.distance ?? 0)
				case 'rating':
					return (b.rating ?? 0) - (a.rating ?? 0)
				case 'expiry':
					return (a.pickupEnd ? new Date(a.pickupEnd).getTime() : Infinity) - (b.pickupEnd ? new Date(b.pickupEnd).getTime() : Infinity)
				default:
					return 0
			}
		})
	}

	const activeFilterCount = [
		(filters.categories?.length ?? 0) > 0,
		(filters.dietaryTags?.length ?? 0) > 0,
		filters.maxDistance !== undefined,
		filters.maxPrice !== undefined,
		filters.minDiscount !== undefined,
		filters.sortBy !== undefined,
	].filter(Boolean).length

	return (
		<div className='space-y-4'>
			{/* ── Header ── */}
			<motion.div variants={slideDown} initial='hidden' animate='visible' className='space-y-3'>
				<div>
					<h1 className='text-xl font-bold font-[var(--font-display)]'>Browse Deals</h1>
					<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>
						{isLoading ? 'Loading...' : `${filtered.length} deals near you`}
					</p>
				</div>

				<SearchBar
					showFilter
					onFilter={() => setShowFilters((p) => !p)}
				/>
			</motion.div>

		{/* ── Category Tabs ── */}
		<AIRecommendations />

		<CategoryTabs value={category} onChange={setCategory} />

			{/* ── Filter Panel (collapsible) ── */}
			<AnimatePresence>
				{showFilters && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className='overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface-card)]'
					>
						<FilterPanel
							filters={filters}
							onChange={setFilters}
							onClose={() => setShowFilters(false)}
						/>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── Toolbar ── */}
			<div className='flex items-center justify-between'>
				<div className='flex items-center gap-2'>
					<span className='text-sm text-[var(--color-text-muted)]'>
						<span className='font-semibold text-[var(--color-text-primary)]'>{filtered.length}</span>{' '}
						results
					</span>
					{activeFilterCount > 0 && (
						<Badge variant='default' className='text-xs'>
							{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
						</Badge>
					)}
				</div>

				<div className='flex items-center border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden'>
					<button
						type='button'
						onClick={() => setLayout('grid')}
						className={cn(
							'p-2 transition-colors',
							layout === 'grid'
								? 'bg-[var(--color-brand-accent)] text-white'
								: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]',
						)}
					>
						<LayoutGrid size={15} />
					</button>
					<button
						type='button'
						onClick={() => setLayout('list')}
						className={cn(
							'p-2 transition-colors',
							layout === 'list'
								? 'bg-[var(--color-brand-accent)] text-white'
								: 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]',
						)}
					>
						<List size={15} />
					</button>
				</div>
			</div>

			{/* ── Loading state ── */}
			{isLoading ? (
				<div className='flex items-center justify-center py-16'>
					<Loader2 size={28} className='animate-spin text-[var(--color-brand-accent)]' />
				</div>
			) : filtered.length === 0 ? (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className='flex flex-col items-center justify-center py-16 text-center'
			>
				<div className='w-16 h-16 rounded-full bg-[var(--color-surface-elevated)] flex items-center justify-center mb-4'>
					<SearchX size={28} className='text-[var(--color-text-muted)]' />
				</div>
				<h3 className='font-bold text-base text-[var(--color-text-primary)] mb-1'>No deals found</h3>
				<p className='text-sm text-[var(--color-text-muted)] max-w-xs'>
					Try changing your filters or search query to find more deals.
				</p>
				<Button
					variant='outline'
					className='mt-4'
					onClick={() => {
						setFilters({})
						setCategory('all')
					}}
				>
					Clear filters
				</Button>
			</motion.div>
			) : layout === 'grid' ? (
				<motion.div
					variants={staggerContainer}
					initial='hidden'
					animate='visible'
					className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
				>
				{filtered.map((food) => (
					<motion.div key={food.id} variants={fadeIn}>
						<FoodCard food={food} onFavoriteToggle={() => favMutation.mutate(food)} />
					</motion.div>
				))}
			</motion.div>
		) : (
			<motion.div
				variants={staggerContainer}
				initial='hidden'
				animate='visible'
				className='space-y-2.5'
			>
				{filtered.map((food) => (
					<motion.div key={food.id} variants={fadeIn}>
						<FoodCard food={food} layout='list' onFavoriteToggle={() => favMutation.mutate(food)} />
					</motion.div>
				))}
				</motion.div>
			)}

			<div className='h-4' />
		</div>
	)
}
