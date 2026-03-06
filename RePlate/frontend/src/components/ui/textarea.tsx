import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return (
		<textarea
			className={cn(
				'flex min-h-[80px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)]',
				'bg-[var(--color-surface-card)] px-3 py-2 text-sm text-[var(--color-text-primary)]',
				'placeholder:text-[var(--color-text-muted)]',
				'transition-colors duration-150',
				'focus:outline-none focus:border-[var(--color-brand-accent)] focus:ring-2 focus:ring-[var(--color-brand-accent)]/20',
				'disabled:cursor-not-allowed disabled:opacity-50',
				className,
			)}
			{...props}
		/>
	)
}

export { Textarea }
