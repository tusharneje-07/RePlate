import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer',
	{
		variants: {
			variant: {
				default:
					'bg-[var(--color-brand-accent)] text-white shadow-sm hover:bg-[var(--color-brand-accent-hover)] hover:shadow-md',
				secondary:
					'bg-[var(--color-brand-secondary)] text-[var(--color-text-primary)] hover:bg-[var(--color-brand-accent-muted)]',
				outline:
					'border border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-brand-accent-light)] hover:border-[var(--color-brand-accent)]',
				ghost:
					'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-brand-accent-light)] hover:text-[var(--color-brand-accent)]',
				destructive:
					'bg-[var(--color-error)] text-white hover:bg-red-700',
				eco:
					'bg-[var(--color-eco)] text-white hover:bg-green-700 shadow-sm',
				link: 'text-[var(--color-brand-accent)] underline-offset-4 hover:underline p-0 h-auto',
			},
			size: {
				default: 'h-10 px-4 py-2',
				sm: 'h-8 px-3 text-xs',
				lg: 'h-12 px-6 text-base',
				xl: 'h-14 px-8 text-base font-semibold',
				icon: 'h-10 w-10',
				'icon-sm': 'h-8 w-8',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
	const Comp = asChild ? Slot : 'button'
	return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { buttonVariants }
