import {
	Sparkles,
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
} from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

const CATEGORIES: { value: string; label: string; Icon: LucideIcon }[] = [
	{ value: 'all', label: 'All', Icon: Sparkles },
	{ value: 'bakery', label: 'Bakery', Icon: Croissant },
	{ value: 'restaurant', label: 'Restaurant', Icon: UtensilsCrossed },
	{ value: 'cafe', label: 'Café', Icon: Coffee },
	{ value: 'grocery', label: 'Grocery', Icon: ShoppingBasket },
	{ value: 'sweets', label: 'Sweets', Icon: Candy },
	{ value: 'fruits', label: 'Fruits', Icon: Apple },
	{ value: 'vegetables', label: 'Veggies', Icon: Carrot },
	{ value: 'dairy', label: 'Dairy', Icon: Milk },
	{ value: 'beverages', label: 'Drinks', Icon: GlassWater },
	{ value: 'snacks', label: 'Snacks', Icon: Cookie },
]

interface CategoryTabsProps {
	value: string
	onChange: (value: string) => void
}

export function CategoryTabs({ value, onChange }: CategoryTabsProps) {
	return (
		<ScrollArea className='w-full'>
			<div className='flex items-center gap-2 pb-2'>
				{CATEGORIES.map((cat) => {
					const isActive = value === cat.value
					return (
						<button
							key={cat.value}
							type='button'
							onClick={() => onChange(cat.value)}
							className={cn(
								'flex items-center gap-1.5 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 flex-shrink-0',
								isActive
									? 'bg-[var(--color-brand-accent)] text-white border-[var(--color-brand-accent)] shadow-sm'
									: 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]',
							)}
						>
							<cat.Icon size={14} />
							{cat.label}
						</button>
					)
				})}
			</div>
			<ScrollBar orientation='horizontal' />
		</ScrollArea>
	)
}
