import { Link, useLocation } from 'react-router-dom'
import { Bell, Leaf, ChevronRight, Building2 } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useNGOStore } from '@/stores/ngo-store'
import { cn } from '@/lib/utils'

interface NGONavbarProps {
	title?: string
}

export function NGONavbar({ title }: NGONavbarProps) {
	const { profile, unreadCount } = useNGOStore()
	const location = useLocation()

	// Derive page title from path if not provided
	const pageTitle =
		title ??
		(() => {
			const path = location.pathname
			if (path === '/ngo/dashboard') return 'Dashboard'
			if (path.startsWith('/ngo/discover')) return 'Discover Donations'
			if (path.startsWith('/ngo/pickups')) return 'Active Pickups'
			if (path.startsWith('/ngo/impact')) return 'Impact & History'
			if (path.startsWith('/ngo/notifications')) return 'Notifications'
			if (path.startsWith('/ngo/profile')) return 'Organisation Profile'
			if (path.startsWith('/ngo/settings')) return 'Settings'
			if (path.startsWith('/ngo/onboarding')) return 'Get Started'
			return 'NGO Portal'
		})()

	return (
		<header className='sticky top-0 z-30 bg-[var(--color-ngo-surface)]/90 backdrop-blur-md border-b border-[var(--color-ngo-border)] h-[64px] flex items-center'>
			<div className='flex items-center justify-between w-full px-4 md:px-6 gap-3'>
				{/* Left: Logo / Page title */}
				<div className='flex items-center gap-3 min-w-0'>
					{/* Mobile: Logo */}
					<Link
						to='/ngo/dashboard'
						className='lg:hidden flex items-center gap-2'
					>
						<div className='w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-ngo-accent)] flex items-center justify-center flex-shrink-0'>
							<Leaf className='w-4 h-4 text-white' strokeWidth={2.5} />
						</div>
						<span className='font-[var(--font-display)] font-bold text-base text-[var(--color-ngo-text-primary)]'>
							Re<span className='text-[var(--color-ngo-accent)]'>Plate</span>
						</span>
					</Link>

					{/* Desktop: Breadcrumb title */}
					<div className='hidden lg:flex items-center gap-2 text-sm text-[var(--color-ngo-text-muted)]'>
						<Building2 size={14} className='text-[var(--color-ngo-accent)]' />
						<span className='text-[var(--color-ngo-text-muted)]'>NGO</span>
						<ChevronRight size={12} />
						<span className='font-semibold text-[var(--color-ngo-text-primary)]'>{pageTitle}</span>
					</div>
				</div>

				{/* Center: Org status pill */}
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className='hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-ngo-border)] bg-[var(--color-ngo-surface-elevated)] text-xs font-medium text-[var(--color-ngo-text-secondary)]'
				>
					<span
						className={cn(
							'w-2 h-2 rounded-full',
							profile.verificationStatus === 'verified'
								? 'bg-[var(--color-success)]'
								: 'bg-[var(--color-warning)]',
						)}
					/>
					{profile.verificationStatus === 'verified' ? 'Verified NGO' : 'Pending Verification'}
					<span className='text-[var(--color-ngo-text-muted)]'>·</span>
					<span className='text-[var(--color-ngo-text-muted)] truncate max-w-[140px]'>
						{profile.organizationName}
					</span>
				</motion.div>

				{/* Right: Actions */}
				<div className='flex items-center gap-1.5'>
					{/* Notifications */}
					<Link
						to='/ngo/notifications'
						className='relative p-2 rounded-[var(--radius-md)] text-[var(--color-ngo-text-muted)] hover:bg-[var(--color-ngo-surface-elevated)] hover:text-[var(--color-ngo-accent)] transition-colors'
					>
						<Bell size={20} />
						{unreadCount > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className='absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-ngo-accent)] rounded-full'
							/>
						)}
					</Link>

					{/* Avatar → Profile */}
					<Link to='/ngo/profile'>
						<Avatar className='w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-[var(--color-ngo-accent)] transition-all'>
							<AvatarImage src={profile.logo} alt={profile.contactPerson} />
							<AvatarFallback
								className='bg-[var(--color-ngo-secondary)] text-[var(--color-ngo-accent)] font-bold text-xs'
							>
								{profile.contactPerson
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