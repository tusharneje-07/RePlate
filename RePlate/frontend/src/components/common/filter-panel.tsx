import { useState } from 'react'
import {
	X,
	Check,
	Croissant,
	UtensilsCrossed,
	Coffee,
	ShoppingBasket,
	Candy,
	Apple,
	Carrot,
	Milk,
	GlassWater,
	Cookie,
	Utensils,
	IceCreamCone,
	type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import type { FoodCategory, DietaryTag, FoodFilters } from '@/types'

const CATEGORIES: { value: FoodCategory; label: string; icon: LucideIcon }[] = [
	{ value: 'bakery', label: 'Bakery', icon: Croissant },
	{ value: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
	{ value: 'cafe', label: 'Café', icon: Coffee },
	{ value: 'grocery', label: 'Grocery', icon: ShoppingBasket },
	{ value: 'sweets', label: 'Sweets', icon: Candy },
	{ value: 'fruits', label: 'Fruits', icon: Apple },
	{ value: 'vegetables', label: 'Vegetables', icon: Carrot },
	{ value: 'dairy', label: 'Dairy', icon: Milk },
	{ value: 'beverages', label: 'Beverages', icon: GlassWater },
	{ value: 'snacks', label: 'Snacks', icon: Cookie },
	{ value: 'meals', label: 'Meals', icon: Utensils },
	{ value: 'desserts', label: 'Desserts', icon: IceCreamCone },
]

const DIETARY_TAGS: { value: DietaryTag; label: string }[] = [
	{ value: 'veg', label: 'Vegetarian' },
	{ value: 'vegan', label: 'Vegan' },
	{ value: 'non-veg', label: 'Non-Veg' },
	{ value: 'gluten-free', label: 'Gluten Free' },
	{ value: 'dairy-free', label: 'Dairy Free' },
	{ value: 'jain', label: 'Jain' },
]

const SORT_OPTIONS = [
	{ value: 'distance', label: 'Nearest First' },
	{ value: 'price', label: 'Lowest Price' },
	{ value: 'discount', label: 'Highest Discount' },
	{ value: 'rating', label: 'Top Rated' },
	{ value: 'expiry', label: 'Expiring Soon' },
]

interface FilterPanelProps {
	filters: FoodFilters
	onChange: (filters: FoodFilters) => void
	onClose?: () => void
}

export function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
	const [local, setLocal] = useState<FoodFilters>(filters)

	function toggle<T>(arr: T[] | undefined, value: T): T[] {
		const cur = arr ?? []
		return cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
	}

	function applyFilters() {
		onChange(local)
		onClose?.()
	}

	function resetFilters() {
		const cleared: FoodFilters = {}
		setLocal(cleared)
		onChange(cleared)
		onClose?.()
	}

	const activeCount = [
		(local.categories?.length ?? 0) > 0,
		(local.dietaryTags?.length ?? 0) > 0,
		local.maxDistance !== undefined,
		local.maxPrice !== undefined,
		local.minDiscount !== undefined,
		local.sortBy !== undefined,
	].filter(Boolean).length

	return (
		<div className='flex flex-col h-full'>
			{/* Header */}
			<div className='flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)]'>
				<div className='flex items-center gap-2'>
					<h2 className='font-bold text-base font-[var(--font-display)]'>Filters</h2>
					{activeCount > 0 && (
						<Badge variant='default' className='text-xs'>
							{activeCount}
						</Badge>
					)}
				</div>
				<div className='flex items-center gap-2'>
					{activeCount > 0 && (
						<button
							type='button'
							onClick={resetFilters}
							className='text-xs text-[var(--color-brand-accent)] hover:underline font-medium'
						>
							Reset all
						</button>
					)}
					{onClose && (
						<button
							type='button'
							onClick={onClose}
							className='p-1.5 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
						>
							<X size={16} />
						</button>
					)}
				</div>
			</div>

			<div className='flex-1 overflow-y-auto px-4 py-4 space-y-6'>
				{/* Sort */}
				<div>
					<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Sort by</h3>
					<div className='flex flex-wrap gap-2'>
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.value}
								type='button'
								onClick={() =>
									setLocal((p) => ({ ...p, sortBy: p.sortBy === opt.value ? undefined : (opt.value as FoodFilters['sortBy']) }))
								}
								className={cn(
									'px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
									local.sortBy === opt.value
										? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)]'
										: 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]',
								)}
							>
								{opt.label}
							</button>
						))}
					</div>
				</div>

				<Separator />

				{/* Categories */}
				<div>
					<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Category</h3>
					<div className='flex flex-wrap gap-2'>
						{CATEGORIES.map((cat) => {
							const selected = local.categories?.includes(cat.value)
							return (
							<button
								key={cat.value}
								type='button'
								onClick={() =>
									setLocal((p) => ({ ...p, categories: toggle(p.categories, cat.value) }))
								}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
									selected
										? 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)] border-[var(--color-brand-accent)]'
										: 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-accent)]',
								)}
							>
								<cat.icon size={12} />
								{cat.label}
								{selected && <Check size={10} />}
							</button>
							)
						})}
					</div>
				</div>

				<Separator />

				{/* Dietary */}
				<div>
					<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>Dietary</h3>
					<div className='flex flex-wrap gap-2'>
						{DIETARY_TAGS.map((tag) => {
							const selected = local.dietaryTags?.includes(tag.value)
							return (
								<button
									key={tag.value}
									type='button'
									onClick={() =>
										setLocal((p) => ({ ...p, dietaryTags: toggle(p.dietaryTags, tag.value) }))
									}
									className={cn(
										'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border transition-all',
										selected
											? 'bg-[var(--color-eco-muted)] text-[var(--color-eco)] border-[var(--color-eco)]'
											: 'bg-transparent text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-eco)]',
									)}
								>
									{tag.label}
									{selected && <Check size={10} />}
								</button>
							)
						})}
					</div>
				</div>

				<Separator />

				{/* Distance */}
				<div>
					<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>
						Max Distance:{' '}
						<span className='text-[var(--color-brand-accent)]'>
							{local.maxDistance ? `${(local.maxDistance / 1000).toFixed(1)} km` : 'Any'}
						</span>
					</h3>
					<input
						type='range'
						min={500}
						max={10000}
						step={500}
						value={local.maxDistance ?? 10000}
						onChange={(e) =>
							setLocal((p) => ({
								...p,
								maxDistance: Number(e.target.value) === 10000 ? undefined : Number(e.target.value),
							}))
						}
						className='w-full accent-[var(--color-brand-accent)]'
					/>
					<div className='flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1'>
						<span>0.5 km</span>
						<span>10 km</span>
					</div>
				</div>

				<Separator />

				{/* Min Discount */}
				<div>
					<h3 className='text-sm font-semibold text-[var(--color-text-primary)] mb-3'>
						Min Discount:{' '}
						<span className='text-[var(--color-brand-accent)]'>
							{local.minDiscount ? `${local.minDiscount}%` : 'Any'}
						</span>
					</h3>
					<div className='flex flex-wrap gap-2'>
						{[20, 30, 40, 50, 60].map((d) => (
							<button
								key={d}
								type='button'
								onClick={() =>
									setLocal((p) => ({ ...p, minDiscount: p.minDiscount === d ? undefined : d }))
								}
								className={cn(
									'px-3 py-1.5 text-xs font-bold rounded-full border transition-all',
									local.minDiscount === d
										? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)]'
										: 'text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-accent)]',
								)}
							>
								{d}%+
							</button>
						))}
					</div>
				</div>
			</div>

			{/* Apply button */}
			<div className='px-4 py-4 border-t border-[var(--color-border)]'>
				<Button onClick={applyFilters} size='lg' className='w-full'>
					Apply Filters
				</Button>
			</div>
		</div>
	)
}
