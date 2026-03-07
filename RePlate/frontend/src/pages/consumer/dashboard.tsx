import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import {
	MapPin,
	Leaf,
	Zap,
	ArrowRight,
	Flame,
	HandHeart,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FoodCard } from '@/components/common/food-card'
import { CategoryTabs } from '@/components/common/category-tabs'
import { SearchBar } from '@/components/common/search-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'
import { listingsApi, impactApi, favoritesApi } from '@/lib/api'
import { mapListingToFoodItem, mapImpactStatsOut } from '@/lib/mappers'
import { useAuth } from '@/hooks/useAuth'
import { useLocationStore } from '@/stores/location-store'
import type { FoodItem } from '@/types'

export function DashboardPage() {
	const { user } = useAuth()
	const { location, openPicker } = useLocationStore()
	const [category, setCategory] = useState('all')
	const queryClient = useQueryClient()

	// Derive greeting name from real auth user
	const firstName = user?.firstName ?? user?.email?.split('@')[0] ?? 'there'

	// Time-aware greeting
	const hour = new Date().getHours()
	const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

	const { data: allFoodItems = [] } = useQuery({
		queryKey: ['listings'],
		queryFn: async () => {
			const { data } = await listingsApi.browse()
			return data.map(mapListingToFoodItem)
		},
	})

	const activeFoodItems = allFoodItems.filter(
		(food) => new Date(food.expiresAt).getTime() > Date.now(),
	)

	const { data: impact } = useQuery({
		queryKey: ['impact'],
		queryFn: async () => {
			const { data } = await impactApi.getMyImpact()
			return mapImpactStatsOut(data)
		},
	})

	// Favorite toggle mutation
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

	const filteredFood =
		category === 'all'
			? activeFoodItems
			: activeFoodItems.filter((f) => f.category === category)

	const urgentDeals = activeFoodItems.filter((f) => {
		if (!f.pickupEnd) return false
		const minsLeft = Math.floor(
			(new Date(f.pickupEnd).getTime() - Date.now()) / 60000,
		)
		return minsLeft > 0 && minsLeft < 90
	})

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-6'
		>
			{/* ── Greeting Header ── */}
			<motion.div variants={slideUp} className='flex items-start justify-between gap-4'>
				<div>
					<p className='text-sm text-[var(--color-text-muted)] mb-0.5'>{greeting}</p>
					<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						{firstName}
					</h1>
				<button
					type='button'
					onClick={openPicker}
					className='flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-brand-accent)] transition-colors'
				>
					<MapPin size={12} className='text-[var(--color-brand-accent)]' />
					{location?.address ?? 'Set your location'}
				</button>
				</div>

				{/* Impact mini badge */}
				<Link
					to='/consumer/impact'
					className='flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2.5 bg-[var(--color-eco-muted)] rounded-[var(--radius-lg)] border border-[var(--color-eco-light)] hover:shadow-md transition-shadow'
				>
					<Leaf size={18} className='text-[var(--color-eco)]' />
					<span className='text-xs font-bold text-[var(--color-eco)]'>
						{impact?.totalCo2Saved ?? 0} kg
					</span>
					<span className='text-[10px] text-[var(--color-text-muted)]'>CO₂ saved</span>
				</Link>
			</motion.div>

			{/* ── Search Bar ── */}
			<motion.div variants={slideUp}>
				<SearchBar
					showFilter
					onFilter={() => {}}
					placeholder='Search food, bakeries, cafés...'
				/>
			</motion.div>

		{/* ── Urgent / Flash Deals ── */}
			{urgentDeals.length > 0 && (
				<motion.section variants={slideUp}>
					<div className='flex items-center justify-between mb-3'>
						<div className='flex items-center gap-2'>
							<Flame size={16} className='text-[var(--color-brand-accent)]' />
							<h2 className='text-base font-bold font-[var(--font-display)]'>Expiring Soon</h2>
							<Badge variant='discount' className='text-[10px]'>
								{urgentDeals.length} deals
							</Badge>
						</div>
						<Link
							to='/consumer/browse'
							className='text-xs text-[var(--color-brand-accent)] font-medium flex items-center gap-1 hover:underline'
						>
							See all <ArrowRight size={12} />
						</Link>
					</div>

				<div className='flex gap-3 overflow-x-auto no-scrollbar pb-2'>
					{urgentDeals.map((food) => (
						<div key={food.id} className='flex-shrink-0 w-[200px]'>
							<FoodCard food={food} onFavoriteToggle={() => favMutation.mutate(food)} />
						</div>
					))}
					</div>
				</motion.section>
			)}

		{/* ── Surplus Food Listing CTA ── */}
			<motion.section variants={slideUp}>
				<Link to='/consumer/list-food'>
					<div className='relative overflow-hidden flex items-center gap-4 px-4 py-4 rounded-[var(--radius-xl)] bg-[var(--color-eco-muted)] border border-[var(--color-eco-light)] hover:shadow-md transition-shadow'>
						<div className='w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-eco)] flex items-center justify-center flex-shrink-0'>
							<HandHeart size={20} className='text-white' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-sm font-bold text-[var(--color-text-primary)]'>
								Have leftover food from an event?
							</p>
							<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>
								List it for NGOs to collect — takes 2 minutes
							</p>
						</div>
						<ArrowRight size={16} className='text-[var(--color-eco)] flex-shrink-0' />
						{/* Decorative */}
						<div className='absolute -right-6 -top-6 w-20 h-20 rounded-full bg-[var(--color-eco)]/10 pointer-events-none' />
					</div>
				</Link>
			</motion.section>

			{/* ── Impact Progress ── */}
			{impact && (
				<motion.section variants={slideUp}>
					<Card className='overflow-hidden'>
						<CardContent className='p-4'>
							<div className='flex items-center justify-between mb-3'>
								<div className='flex items-center gap-2'>
									<Leaf size={16} className='text-[var(--color-eco)]' />
									<h2 className='text-sm font-bold font-[var(--font-display)]'>Your Impact</h2>
								</div>
								<Link
									to='/consumer/impact'
									className='text-xs text-[var(--color-brand-accent)] font-medium hover:underline flex items-center gap-1'
								>
									Details <ArrowRight size={11} />
								</Link>
							</div>

							<div className='grid grid-cols-3 gap-3 mb-4'>
								{[
									{
										label: 'CO₂ Saved',
										value: `${impact.totalCo2Saved}kg`,
										color: 'text-[var(--color-eco)]',
									},
									{
										label: 'Money Saved',
										value: formatCurrency(impact.totalMoneySaved),
										color: 'text-[var(--color-brand-accent)]',
									},
									{
										label: 'Meals Rescued',
										value: `${impact.totalMealsRescued}`,
										color: 'text-[var(--color-info)]',
									},
								].map((stat) => (
									<div key={stat.label} className='text-center'>
										<p className={`text-base font-bold font-[var(--font-display)] ${stat.color}`}>
											{stat.value}
										</p>
										<p className='text-[10px] text-[var(--color-text-muted)] mt-0.5'>{stat.label}</p>
									</div>
								))}
							</div>

							{/* Level progress */}
							<div>
								<div className='flex items-center justify-between mb-1.5'>
									<span className='flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-primary)] capitalize'>
										<Leaf size={12} className='text-[var(--color-eco)]' />
										{impact.level} Level
									</span>
									<span className='text-xs text-[var(--color-text-muted)]'>
										{impact.nextLevelProgress}% to next
									</span>
								</div>
								<Progress value={impact.nextLevelProgress} className='h-2' />
							</div>
						</CardContent>
					</Card>
				</motion.section>
			)}

			{/* ── Browse by Category ── */}
			<motion.section variants={slideUp}>
				<div className='flex items-center justify-between mb-3'>
					<h2 className='text-base font-bold font-[var(--font-display)]'>Deals Near You</h2>
					<Badge variant='eco' className='text-[10px]'>
						{filteredFood.length} available
					</Badge>
				</div>
				<CategoryTabs value={category} onChange={setCategory} />
			</motion.section>

			{/* ── Food Grid ── */}
			<motion.div
				variants={staggerContainer}
				className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3'
			>
			{filteredFood.slice(0, 6).map((food) => (
				<motion.div key={food.id} variants={fadeIn}>
					<FoodCard food={food} onFavoriteToggle={() => favMutation.mutate(food)} />
				</motion.div>
			))}
			</motion.div>

			{filteredFood.length > 6 && (
				<motion.div variants={slideUp} className='text-center pt-2'>
					<Link to='/consumer/browse'>
						<Button variant='outline' size='lg' className='gap-2'>
							View all {filteredFood.length} deals
							<ArrowRight size={16} />
						</Button>
					</Link>
				</motion.div>
			)}

			{/* ── Quick Picks (list layout) ── */}
			<motion.section variants={slideUp}>
				<div className='flex items-center justify-between mb-3'>
					<div className='flex items-center gap-2'>
						<Zap size={16} className='text-[var(--color-warning)]' />
						<h2 className='text-base font-bold font-[var(--font-display)]'>Quick Picks</h2>
					</div>
				</div>
			<div className='space-y-2.5'>
				{activeFoodItems.slice(0, 4).map((food) => (
					<FoodCard key={food.id} food={food} layout='list' onFavoriteToggle={() => favMutation.mutate(food)} />
				))}
			</div>
			</motion.section>

			{/* Bottom padding for mobile nav */}
			<div className='h-4' />
		</motion.div>
	)
}
