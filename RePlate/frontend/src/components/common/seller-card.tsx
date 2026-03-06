import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { MapPin, Star, Heart, Package, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cardHover } from '@/lib/motion'
import { formatDistance } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Seller } from '@/types'

interface SellerCardProps {
	seller: Seller
}

export function SellerCard({ seller }: SellerCardProps) {
	return (
		<motion.div
			variants={cardHover}
			initial='rest'
			whileHover='hover'
			className='group flex flex-col bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
		>
			{/* Cover */}
			<Link to={`/consumer/browse?seller=${seller.id}`} className='block relative'>
				<div className='h-28 overflow-hidden bg-[var(--color-border-subtle)]'>
					{seller.coverImage ? (
						<img
							src={seller.coverImage}
							alt={seller.name}
							className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
						/>
					) : (
						<div className='w-full h-full bg-gradient-to-br from-[var(--color-brand-secondary)] to-[var(--color-brand-accent-muted)]' />
					)}
				</div>

				{/* Open/Closed pill */}
				<span
					className={cn(
						'absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full',
						seller.isOpen
							? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
							: 'bg-[var(--color-error-light)] text-[var(--color-error)]',
					)}
				>
					{seller.isOpen ? 'Open' : 'Closed'}
				</span>

				{/* Favorite */}
				<button
					type='button'
					className='absolute bottom-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm text-[var(--color-text-muted)] hover:text-rose-500 transition-colors'
				>
					<Heart size={13} className={cn(seller.isFavorited && 'fill-rose-500 text-rose-500')} />
				</button>
			</Link>

			{/* Content */}
			<div className='p-3.5 flex flex-col gap-2.5'>
				{/* Header row */}
				<div className='flex items-start gap-2.5'>
					{/* Logo */}
					<div className='w-10 h-10 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] flex-shrink-0 bg-[var(--color-surface-elevated)]'>
						{seller.logo ? (
							<img src={seller.logo} alt={seller.name} className='w-full h-full object-cover' />
						) : (
							<div className='w-full h-full bg-[var(--color-brand-secondary)] flex items-center justify-center'>
								<span className='text-sm font-bold text-[var(--color-brand-accent)]'>
									{seller.name[0]}
								</span>
							</div>
						)}
					</div>
					<div className='min-w-0 flex-1'>
						<Link to={`/consumer/browse?seller=${seller.id}`}>
							<h3 className='font-semibold text-sm text-[var(--color-text-primary)] leading-tight hover:text-[var(--color-brand-accent)] transition-colors truncate'>
								{seller.name}
							</h3>
						</Link>
						<Badge variant='muted' className='mt-0.5 text-[10px] py-0 px-1.5 capitalize'>
							{seller.category}
						</Badge>
					</div>
				</div>

				{/* Stats row */}
				<div className='flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]'>
					<span className='flex items-center gap-1'>
						<Star size={11} className='text-amber-400 fill-amber-400' />
						<span className='font-semibold text-[var(--color-text-secondary)]'>{seller.rating}</span>
						<span>({seller.reviewCount})</span>
					</span>
					{seller.distance !== undefined && (
						<span className='flex items-center gap-1'>
							<MapPin size={10} />
							{formatDistance(seller.distance)}
						</span>
					)}
					<span className='flex items-center gap-1'>
						<Clock size={10} />
						{seller.openTime}–{seller.closeTime}
					</span>
				</div>

				{/* Listings count */}
				{seller.activeListing > 0 && (
					<div className='flex items-center gap-1.5 text-[11px] text-[var(--color-brand-accent)] font-medium'>
						<Package size={12} />
						{seller.activeListing} deals available
					</div>
				)}
			</div>
		</motion.div>
	)
}
