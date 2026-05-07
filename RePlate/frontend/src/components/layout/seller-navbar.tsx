import { Link, useLocation } from 'react-router-dom'
import { Bell, Sprout, Store, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useSellerStore } from '@/stores/seller-store'

interface SellerNavbarProps {
	title?: string
}

export function SellerNavbar({ title }: SellerNavbarProps) {
	const { unreadCount, profile } = useSellerStore()
	const location = useLocation()
	const ownerName = profile?.ownerName ?? 'Seller'

	// Derive page title from path if not provided
	const pageTitle =
		title ??
		(() => {
			const path = location.pathname
			if (path === '/seller/dashboard') return 'Dashboard'
			if (path.startsWith('/seller/listings/new')) return 'Create Listing'
			if (path.startsWith('/seller/listings')) return 'Listings'
			if (path.startsWith('/seller/orders')) return 'Orders'
			if (path.startsWith('/seller/analytics')) return 'Analytics'
			if (path.startsWith('/seller/notifications')) return 'Notifications'
			if (path.startsWith('/seller/reviews')) return 'Reviews'
			if (path.startsWith('/seller/profile')) return 'Store Profile'
			if (path.startsWith('/seller/settings')) return 'Settings'
			if (path.startsWith('/seller/onboarding')) return 'Get Started'
			return 'Seller Portal'
		})()

	return (
		<header className='sticky top-0 z-30 bg-[var(--color-seller-surface)]/90 backdrop-blur-md border-b border-[var(--color-seller-border)] h-[64px] flex items-center'>
			<div className='flex items-center justify-between w-full px-4 md:px-6 gap-3'>
				{/* Left: Logo / Page title */}
				<div className='flex items-center gap-3 min-w-0'>
					{/* Mobile: Logo */}
					<Link
						to='/seller/dashboard'
						className='lg:hidden flex items-center gap-2'
					>
						<div className='w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-seller-accent)] flex items-center justify-center flex-shrink-0'>
							<Sprout className='w-4 h-4 text-white' strokeWidth={2.5} />
						</div>
						<span className='font-[var(--font-display)] font-bold text-base text-[var(--color-seller-text-primary)]'>
							Re<span className='text-[var(--color-seller-accent)]'>Plate</span>
						</span>
					</Link>

					{/* Desktop: Breadcrumb title */}
					<div className='hidden lg:flex items-center gap-2 text-sm text-[var(--color-seller-text-muted)]'>
						<Store size={14} className='text-[var(--color-seller-accent)]' />
						<span className='text-[var(--color-seller-text-muted)]'>Seller</span>
						<ChevronRight size={12} />
						<span className='font-semibold text-[var(--color-seller-text-primary)]'>{pageTitle}</span>
					</div>
				</div>

				{/* Right: Actions */}
				<div className='flex items-center gap-1.5'>
					{/* Notifications */}
					<Link
						to='/seller/notifications'
						className='relative p-2 rounded-[var(--radius-md)] text-[var(--color-seller-text-muted)] hover:bg-[var(--color-seller-surface-elevated)] hover:text-[var(--color-seller-accent)] transition-colors'
					>
						<Bell size={20} />
						{unreadCount > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className='absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-seller-accent)] rounded-full'
							/>
						)}
					</Link>

					{/* Avatar → Profile */}
					<Link to='/seller/profile'>
						<Avatar className='w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-[var(--color-seller-accent)] transition-all'>
							<AvatarImage src={profile?.logo} alt={ownerName} />
							<AvatarFallback
								className='bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] font-bold text-xs'
							>
								{ownerName
									.split(' ')
									.map((n) => n[0])
									.join('')}
							</AvatarFallback>
						</Avatar>
					</Link>
				</div>
			</div>
		</header>
	)
}
