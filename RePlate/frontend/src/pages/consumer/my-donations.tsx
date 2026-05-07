import { useState } from 'react'
import { motion } from 'motion/react'
import { Leaf, Loader2, Package, Clock, CheckCircle2, AlertTriangle, ChevronRight, Plus } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { consumerApi, type SurplusDonationOut } from '@/lib/api'
import { cn, formatDateTimeIST } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
	return formatDateTimeIST(iso, {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

function getStatusInfo(donation: SurplusDonationOut): {
	label: string
	color: string
	icon: typeof CheckCircle2
} {
	if (!donation.is_active) {
		return { label: 'Picked Up', color: 'text-[var(--color-success)] bg-[var(--color-success)]/10', icon: CheckCircle2 }
	}
	const now = Date.now()
	const expires = donation.expires_at ? new Date(donation.expires_at).getTime() : Infinity
	if (expires < now) {
		return { label: 'Expired', color: 'text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]', icon: AlertTriangle }
	}
	return { label: 'Listed', color: 'text-[var(--color-eco)] bg-[var(--color-eco-muted)]', icon: Package }
}

// ── Donation Card ──────────────────────────────────────────────

function DonationCard({ donation }: { donation: SurplusDonationOut }) {
	const status = getStatusInfo(donation)
	const StatusIcon = status.icon

	return (
		<motion.div variants={fadeIn}>
			<div className='bg-white rounded-[var(--radius-lg)] border border-[var(--color-border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow'>
				{/* Top row */}
				<div className='p-4 pb-3'>
					<div className='flex items-start justify-between gap-2 mb-2'>
						<div className='flex-1 min-w-0'>
							<h3 className='font-semibold text-[var(--color-text-primary)] truncate font-[var(--font-display)]'>
								{donation.title}
							</h3>
							<p className='text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-1'>
								{donation.seller_address ?? 'No address specified'}
							</p>
						</div>
						<Badge className={cn('text-xs font-medium shrink-0 flex items-center gap-1', status.color)}>
							<StatusIcon size={11} />
							{status.label}
						</Badge>
					</div>

					{/* Meta */}
					<div className='flex flex-wrap gap-2 text-xs text-[var(--color-text-secondary)]'>
						<span className='flex items-center gap-1'>
							<Package size={11} />
							{donation.quantity_available} {donation.quantity_unit}
						</span>
						<span className='flex items-center gap-1'>
							<Leaf size={11} />
							{donation.category}
						</span>
						{donation.expires_at && (
							<span className='flex items-center gap-1'>
								<Clock size={11} />
								Expires {formatDate(donation.expires_at)}
							</span>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className='px-4 py-2.5 bg-[var(--color-surface-alt)] border-t border-[var(--color-border)] flex items-center justify-between'>
					<span className='text-xs text-[var(--color-text-muted)]'>
						Listed {formatDate(donation.created_at)}
					</span>
					{donation.is_active && (
						<span className='text-xs text-[var(--color-eco)] font-medium flex items-center gap-0.5'>
							Visible to NGOs
							<ChevronRight size={12} />
						</span>
					)}
				</div>
			</div>
		</motion.div>
	)
}

// ── Empty State ────────────────────────────────────────────────

function EmptyState() {
	const navigate = useNavigate()
	return (
		<motion.div variants={fadeIn} className='flex flex-col items-center justify-center py-16 text-center space-y-4'>
			<div className='w-16 h-16 rounded-full bg-[var(--color-eco-muted)] flex items-center justify-center'>
				<Leaf size={28} className='text-[var(--color-eco)]' />
			</div>
			<div>
				<h3 className='font-semibold text-[var(--color-text-primary)] text-lg font-[var(--font-display)]'>
					No donations yet
				</h3>
				<p className='text-sm text-[var(--color-text-muted)] mt-1 max-w-xs mx-auto'>
					Share your surplus food with NGOs and help reduce food waste in your community.
				</p>
			</div>
			<Button
				onClick={() => navigate('/consumer/list-food')}
				className='bg-[var(--color-eco)] hover:bg-[var(--color-eco-dark)] text-white mt-2'
			>
				<Plus size={16} className='mr-1.5' />
				List Surplus Food
			</Button>
		</motion.div>
	)
}

// ── Page ───────────────────────────────────────────────────────

export function MyDonationsPage() {
	const { isLoading: authLoading, isAuthenticated } = useAuth()

	const { data, isLoading, isError } = useQuery({
		queryKey: ['consumer-donations'],
		queryFn: async () => {
			const res = await consumerApi.getMyDonations({ limit: 50 })
			return res.data
		},
		enabled: !authLoading && isAuthenticated,
		refetchInterval: 30_000,
	})

	const donations: SurplusDonationOut[] = data?.data ?? []

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp}>
				<div className='flex items-center justify-between mb-1'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
						My Donations
					</h1>
					<Link to='/consumer/list-food'>
						<Button
							size='sm'
							className='bg-[var(--color-eco)] hover:bg-[var(--color-eco-dark)] text-white h-8 text-xs'
						>
							<Plus size={14} className='mr-1' />
							List More
						</Button>
					</Link>
				</div>
				<p className='text-sm text-[var(--color-text-muted)]'>
					Your surplus food listings shared with NGOs
				</p>
			</motion.div>

			{/* Stats summary */}
			{donations.length > 0 && (
				<motion.div variants={slideUp} className='grid grid-cols-2 gap-3'>
					<div className='bg-[var(--color-eco-muted)] rounded-[var(--radius-md)] p-3 text-center border border-[var(--color-eco-light)]'>
						<p className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-eco)]'>
							{donations.length}
						</p>
						<p className='text-xs text-[var(--color-eco-dark)] mt-0.5'>Total Listed</p>
					</div>
					<div className='bg-[var(--color-surface-alt)] rounded-[var(--radius-md)] p-3 text-center border border-[var(--color-border)]'>
						<p className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
							{donations.reduce((sum, d) => sum + d.quantity_available, 0)}
						</p>
						<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>kg Listed</p>
					</div>
				</motion.div>
			)}

			{/* Content */}
			{isLoading || authLoading ? (
				<motion.div variants={fadeIn} className='flex justify-center py-12'>
					<Loader2 size={28} className='animate-spin text-[var(--color-eco)]' />
				</motion.div>
			) : isError ? (
				<motion.div variants={fadeIn} className='text-center py-12 text-[var(--color-text-muted)]'>
					<AlertTriangle size={32} className='mx-auto mb-2 opacity-50' />
					<p className='text-sm'>Failed to load donations. Please try again.</p>
				</motion.div>
			) : donations.length === 0 ? (
				<EmptyState />
			) : (
				<motion.div variants={staggerContainer} className='space-y-3'>
					{donations.map((donation) => (
						<DonationCard key={donation.id} donation={donation} />
					))}
				</motion.div>
			)}
		</motion.div>
	)
}
