import { Search, X, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

interface SearchBarProps {
	placeholder?: string
	className?: string
	onFilter?: () => void
	showFilter?: boolean
}

export function SearchBar({
	placeholder = 'Search food, bakeries, cafés...',
	className,
	onFilter,
	showFilter = false,
}: SearchBarProps) {
	const { searchQuery, setSearchQuery } = useUIStore()

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div className='relative flex-1'>
				<Search
					size={16}
					className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none'
				/>
				<Input
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder={placeholder}
					className='pl-9 pr-9 h-11 text-sm'
				/>
				<AnimatePresence>
					{searchQuery && (
						<motion.button
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							type='button'
							onClick={() => setSearchQuery('')}
							className='absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors'
						>
							<X size={14} />
						</motion.button>
					)}
				</AnimatePresence>
			</div>

			{showFilter && (
				<Button
					variant='outline'
					size='icon'
					onClick={onFilter}
					className='h-11 w-11 flex-shrink-0'
				>
					<SlidersHorizontal size={16} />
				</Button>
			)}
		</div>
	)
}
