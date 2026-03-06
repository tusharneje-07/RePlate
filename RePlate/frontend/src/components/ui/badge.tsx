import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
	'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none',
	{
		variants: {
			variant: {
				default: 'border-transparent bg-[var(--color-brand-accent)] text-white',
				secondary: 'border-transparent bg-[var(--color-brand-secondary)] text-[var(--color-text-primary)]',
				outline: 'border-[var(--color-border)] text-[var(--color-text-secondary)] bg-transparent',
				success: 'border-transparent bg-[var(--color-success-light)] text-[var(--color-success)]',
				warning: 'border-transparent bg-[var(--color-warning-light)] text-[var(--color-warning)]',
				error: 'border-transparent bg-[var(--color-error-light)] text-[var(--color-error)]',
				eco: 'border-transparent bg-[var(--color-eco-light)] text-[var(--color-eco)]',
				discount: 'border-transparent bg-[var(--color-brand-accent)] text-white font-bold',
				muted: 'border-transparent bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
)

interface BadgeProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
	return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { badgeVariants }
