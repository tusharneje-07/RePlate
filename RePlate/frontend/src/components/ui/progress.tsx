import * as ProgressPrimitive from '@radix-ui/react-progress'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
	indicatorClassName?: string
}

function Progress({ className, value, indicatorClassName, ...props }: ProgressProps) {
	return (
		<ProgressPrimitive.Root
			className={cn('relative h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]', className)}
			{...props}
		>
			<ProgressPrimitive.Indicator
				className={cn(
					'h-full w-full flex-1 bg-[var(--color-brand-accent)] transition-all duration-500 ease-out rounded-full',
					indicatorClassName,
				)}
				style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
			/>
		</ProgressPrimitive.Root>
	)
}

export { Progress }
