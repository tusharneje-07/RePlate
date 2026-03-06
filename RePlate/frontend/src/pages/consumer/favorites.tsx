import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Heart, Search, UtensilsCrossed, Store, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FoodCard } from '@/components/common/food-card'
import { SellerCard } from '@/components/common/seller-card'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { favoritesApi } from '@/lib/api'
import { mapListingToFoodItem } from '@/lib/mappers'
import { cn } from '@/lib/utils'
import type { Seller } from '@/types'

type FavTab = 'food' | 'sellers'

export function FavoritesPage() {
	const [tab, setTab] = useState<FavTab>('food')
	const [search, setSearch] = useState('')
	const queryClient = useQueryClient()

	const { data: favorites = [], isLoading } = useQuery({
		queryKey: ['favorites'],
		queryFn: async () => {
			const { data } = await favoritesApi.list()
			return data
		},
	})

	const removeMutation = useMutation({
		mutationFn: (favoriteId: string) => favoritesApi.remove(favoriteId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['favorites'] })
		},
	})

	const favoriteFoods = favorites
		.filter((f) => f.favorite_type === 'food' && f.food_listing != null)
		.map((f) => ({
			favoriteId: f.id,
			foodItem: mapListingToFoodItem({ ...f.food_listing!, is_favorited: true }),
		}))

	const favoriteSellers: { favoriteId: string; seller: Seller }[] = favorites
		.filter((f) => f.favorite_type === 'seller' && f.seller_id != null)
		.map((f) => ({
			favoriteId: f.id,
			seller: {
				id: f.seller_id!,
				name: f.seller_name ?? 'Unknown Seller',
				logo: f.seller_logo ?? undefined,
				coverImage: undefined,
				description: '',
				category: 'restaurant' as const,
				address: '',
				location: { lat: 0, lng: 0 },
				distance: undefined,
				rating: 0,
				reviewCount: 0,
				phone: '',
				openTime: '',
				closeTime: '',
				isOpen: true,
				totalFoodSaved: 0,
				activeListing: 0,
				isFavorited: true,
			},
		}))

	const filteredFoods = favoriteFoods.filter(
		({ foodItem }) =>
			foodItem.name.toLowerCase().includes(search.toLowerCase()) ||
			foodItem.seller.name.toLowerCase().includes(search.toLowerCase()),
	)
	const filteredSellers = favoriteSellers.filter(({ seller }) =>
		seller.name.toLowerCase().includes(search.toLowerCase()),
	)

	const currentCount = tab === 'food' ? filteredFoods.length : filteredSellers.length
	const isEmpty = currentCount === 0

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-6 pb-6'
		>
			{/* ── Header ── */}
			<motion.div variants={slideUp}>
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
							Favourites
						</h1>
						<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>
							{favoriteFoods.length} food item{favoriteFoods.length !== 1 ? 's' : ''} &middot;{' '}
							{favoriteSellers.length} seller{favoriteSellers.length !== 1 ? 's' : ''}
						</p>
					</div>
					<div className='w-11 h-11 rounded-[var(--radius-xl)] bg-rose-50 flex items-center justify-center'>
						<Heart size={20} className='text-rose-500 fill-rose-500' />
					</div>
				</div>
			</motion.div>

			{/* ── Search ── */}
			<motion.div variants={slideUp} className='relative'>
				<Search
					size={15}
					className='absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none'
				/>
				<input
					type='text'
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder={tab === 'food' ? 'Search saved food items...' : 'Search saved sellers...'}
					className='w-full h-11 pl-10 pr-4 text-sm bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-[var(--radius-full)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-accent)] transition-colors'
				/>
			</motion.div>

			{/* ── Tabs ── */}
			<motion.div
				variants={slideUp}
				className='flex gap-1 bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-1'
			>
				<button
					type='button'
					onClick={() => setTab('food')}
					className={cn(
						'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all',
						tab === 'food'
							? 'bg-[var(--color-brand-accent)] text-white shadow-sm'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
					)}
				>
					<UtensilsCrossed size={15} />
					Food Items
					<span
						className={cn(
							'text-[11px] px-1.5 py-0.5 rounded-full font-semibold',
							tab === 'food'
								? 'bg-white/20 text-white'
								: 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]',
						)}
					>
						{favoriteFoods.length}
					</span>
				</button>
				<button
					type='button'
					onClick={() => setTab('sellers')}
					className={cn(
						'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all',
						tab === 'sellers'
							? 'bg-[var(--color-brand-accent)] text-white shadow-sm'
							: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
					)}
				>
					<Store size={15} />
					Sellers
					<span
						className={cn(
							'text-[11px] px-1.5 py-0.5 rounded-full font-semibold',
							tab === 'sellers'
								? 'bg-white/20 text-white'
								: 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]',
						)}
					>
						{favoriteSellers.length}
					</span>
				</button>
			</motion.div>

			{/* ── Content ── */}
			{isLoading ? (
				<motion.div variants={fadeIn} className='flex items-center justify-center py-16'>
					<Loader2 size={28} className='animate-spin text-[var(--color-brand-accent)]' />
				</motion.div>
			) : (
				<AnimatePresence mode='wait'>
					{isEmpty ? (
						<motion.div
							key='empty'
							variants={fadeIn}
							initial='hidden'
							animate='visible'
							exit='hidden'
							className='flex flex-col items-center gap-5 py-20 text-center'
						>
							<div className='w-20 h-20 rounded-[var(--radius-2xl)] bg-rose-50 flex items-center justify-center'>
								{tab === 'food' ? (
									<UtensilsCrossed size={32} className='text-rose-300' />
								) : (
									<Store size={32} className='text-rose-300' />
								)}
							</div>
							<div>
								<p className='text-base font-semibold text-[var(--color-text-primary)]'>
									{search
										? 'No matches found'
										: tab === 'food'
											? 'No saved food items yet'
											: 'No saved sellers yet'}
								</p>
								<p className='text-sm text-[var(--color-text-muted)] mt-1.5 max-w-xs'>
									{search
										? 'Try a different search term.'
										: tab === 'food'
											? 'Tap the heart icon on any food card to save it here for quick access.'
											: 'Follow sellers to keep track of their new surplus listings.'}
								</p>
							</div>
							{!search && (
								<Button asChild variant='outline' size='sm' className='gap-1.5'>
									<Link to='/consumer/browse'>
										Browse Deals
										<ArrowRight size={14} />
									</Link>
								</Button>
							)}
						</motion.div>
					) : tab === 'food' ? (
						<motion.div
							key='food-grid'
							variants={staggerContainer}
							initial='hidden'
							animate='visible'
							className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
						>
							{filteredFoods.map(({ favoriteId, foodItem }) => (
								<motion.div key={favoriteId} variants={slideUp}>
									<FoodCard
										food={foodItem}
										onFavoriteToggle={() => removeMutation.mutate(favoriteId)}
									/>
								</motion.div>
							))}
						</motion.div>
					) : (
						<motion.div
							key='sellers-grid'
							variants={staggerContainer}
							initial='hidden'
							animate='visible'
							className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
						>
							{filteredSellers.map(({ favoriteId, seller }) => (
								<motion.div key={favoriteId} variants={slideUp}>
									<SellerCard seller={seller} />
								</motion.div>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			)}
		</motion.div>
	)
}
