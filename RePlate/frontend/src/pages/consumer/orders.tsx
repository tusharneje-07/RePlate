import { useState } from 'react'
import { motion } from 'motion/react'
import { ShoppingBag, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { OrderCard } from '@/components/common/order-card'
import { Button } from '@/components/ui/button'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { ordersApi } from '@/lib/api'
import { mapOrderOutToOrder } from '@/lib/mappers'
import { cn } from '@/lib/utils'
import type { OrderStatus } from '@/types'
import { useAuth } from '@/hooks/useAuth'

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled'

const TABS: { id: FilterTab; label: string }[] = [
	{ id: 'all', label: 'All' },
	{ id: 'active', label: 'Active' },
	{ id: 'completed', label: 'Completed' },
	{ id: 'cancelled', label: 'Cancelled' },
]

const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready_for_pickup']

export function OrdersPage() {
	const [tab, setTab] = useState<FilterTab>('all')
	const { isLoading: authLoading, isAuthenticated } = useAuth()

	const { data: rawOrders = [], isLoading } = useQuery({
		queryKey: ['orders'],
		queryFn: async () => {
			const { data } = await ordersApi.list()
			return data.map(mapOrderOutToOrder)
		},
		// Don't fire until auth has resolved — prevents a 401 on first mount
		// that would cache an empty result before the token is confirmed present.
		enabled: !authLoading && isAuthenticated,
		refetchInterval: 30_000,
	})

	const filtered = rawOrders.filter((o) => {
		if (tab === 'all') return true
		if (tab === 'active') return ACTIVE_STATUSES.includes(o.status)
		if (tab === 'completed') return o.status === 'completed'
		if (tab === 'cancelled') return o.status === 'cancelled'
		return true
	})

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp}>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					My Orders
				</h1>
				<p className='text-sm text-[var(--color-text-muted)] mt-0.5'>
					{isLoading ? '...' : `${rawOrders.length} order${rawOrders.length !== 1 ? 's' : ''} total`}
				</p>
			</motion.div>

			{/* Filter Tabs */}
			<motion.div variants={slideUp} className='flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 no-scrollbar'>
				{TABS.map((t) => {
					const count =
						t.id === 'all'
							? rawOrders.length
							: rawOrders.filter((o) =>
									t.id === 'active'
										? ACTIVE_STATUSES.includes(o.status)
										: o.status === t.id,
								).length
					return (
						<button
							key={t.id}
							type='button'
							onClick={() => setTab(t.id)}
							className={cn(
								'flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-full)] text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
								tab === t.id
									? 'bg-[var(--color-brand-accent)] text-white shadow-sm'
									: 'bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-brand-accent-muted)]',
							)}
						>
							{t.label}
							{count > 0 && (
								<span className={cn(
									'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
									tab === t.id ? 'bg-white/20' : 'bg-[var(--color-brand-accent-light)] text-[var(--color-brand-accent)]',
								)}>
									{count}
								</span>
							)}
						</button>
					)
				})}
			</motion.div>

			{/* Loading */}
			{isLoading ? (
				<motion.div variants={fadeIn} className='flex items-center justify-center py-16'>
					<Loader2 size={28} className='animate-spin text-[var(--color-brand-accent)]' />
				</motion.div>
			) : filtered.length === 0 ? (
				<motion.div
					variants={fadeIn}
					className='flex flex-col items-center gap-4 py-16 text-center'
				>
					<div className='w-16 h-16 rounded-full bg-[var(--color-brand-accent-light)] flex items-center justify-center'>
						<ShoppingBag size={28} className='text-[var(--color-brand-accent)]' />
					</div>
					<div>
						<p className='text-base font-semibold text-[var(--color-text-primary)]'>No orders found</p>
						<p className='text-sm text-[var(--color-text-muted)] mt-1'>
							{tab === 'active' ? "You have no active orders right now." : "No orders in this category yet."}
						</p>
					</div>
					<Button asChild variant='outline' size='sm'>
						<Link to='/consumer/browse'>Browse Food</Link>
					</Button>
				</motion.div>
			) : (
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
					{filtered.map((order, i) => (
						<motion.div
							key={order.id}
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.25, ease: 'easeOut', delay: i * 0.07 }}
						>
							<OrderCard order={order} />
						</motion.div>
					))}
				</div>
			)}
		</motion.div>
	)
}
