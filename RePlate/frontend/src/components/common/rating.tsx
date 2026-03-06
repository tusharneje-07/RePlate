import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingProps {
	value: number
	reviewCount?: number
	size?: 'sm' | 'md'
}

export function Rating({ value, reviewCount, size = 'sm' }: RatingProps) {
	const starSize = size === 'sm' ? 11 : 14

	return (
		<div className='flex items-center gap-1'>
			<div className='flex items-center gap-0.5'>
				{[1, 2, 3, 4, 5].map((i) => (
					<Star
						key={i}
						size={starSize}
						className={cn(
							i <= Math.round(value)
								? 'text-amber-400 fill-amber-400'
								: 'text-[var(--color-border)] fill-[var(--color-border)]',
						)}
					/>
				))}
			</div>
			<span className={cn('font-semibold text-[var(--color-text-secondary)]', size === 'sm' ? 'text-xs' : 'text-sm')}>
				{value.toFixed(1)}
			</span>
			{reviewCount !== undefined && (
				<span className={cn('text-[var(--color-text-muted)]', size === 'sm' ? 'text-[10px]' : 'text-xs')}>
					({reviewCount})
				</span>
			)}
		</div>
	)
}
