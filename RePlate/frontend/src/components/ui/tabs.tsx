import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
	return (
		<TabsPrimitive.List
			className={cn(
				'inline-flex items-center justify-start rounded-[var(--radius-md)] bg-[var(--color-border-subtle)] p-1 gap-1',
				className,
			)}
			{...props}
		/>
	)
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			className={cn(
				'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-all',
				'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
				'data-[state=active]:bg-[var(--color-surface-card)] data-[state=active]:text-[var(--color-brand-accent)] data-[state=active]:shadow-sm',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-accent)]',
				'disabled:pointer-events-none disabled:opacity-50',
				className,
			)}
			{...props}
		/>
	)
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			className={cn('mt-3 focus-visible:outline-none', className)}
			{...props}
		/>
	)
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
