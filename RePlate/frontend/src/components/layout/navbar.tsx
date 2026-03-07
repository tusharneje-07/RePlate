import { Link } from 'react-router-dom'
import { Bell, MapPin, Search, ShoppingCart, Menu, Sprout } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useCartStore } from '@/stores/cart-store'
import { useUIStore } from '@/stores/ui-store'
import { useLocationStore } from '@/stores/location-store'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

interface NavbarProps {
	title?: string
	showBack?: boolean
}

export function Navbar({ title, showBack: _showBack }: NavbarProps) {
	const { totalItems } = useCartStore()
	const { toggleSidebar, setNotificationSheetOpen, setIsSearchOpen } = useUIStore()
	const { location, openPicker } = useLocationStore()
	const { user } = useAuth()
	// No consumer notifications API yet — badge hidden until backend is available
	const unreadCount = 0

	const locationLabel = location?.address ?? 'Set your location'
	const avatarName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email : '?'

	return (
		<header className='sticky top-0 z-30 bg-[var(--color-surface-card)]/90 backdrop-blur-md border-b border-[var(--color-border)] h-[64px] flex items-center'>
			<div className='flex items-center justify-between w-full px-4 md:px-6 gap-3'>
				{/* Left: Mobile menu + Logo / Title */}
				<div className='flex items-center gap-3 min-w-0'>
					<button
						type='button'
						onClick={toggleSidebar}
						className='lg:hidden p-2 -ml-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)] transition-colors'
					>
						<Menu size={20} />
					</button>

					{title ? (
						<h1 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-text-primary)] truncate'>
							{title}
						</h1>
					) : (
						<Link to='/consumer/dashboard' className='flex items-center gap-2'>
							<div className='lg:hidden w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-brand-accent)] flex items-center justify-center'>
								<Sprout className='w-4 h-4 text-white' strokeWidth={2.5} />
							</div>
							<span className='lg:hidden font-[var(--font-display)] font-bold text-base text-[var(--color-text-primary)]'>
								Re<span className='text-[var(--color-brand-accent)]'>Plate</span>
							</span>
						</Link>
					)}
				</div>

				{/* Center: Location pill (md+) */}
				<button
					type='button'
					onClick={openPicker}
					className='hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)] transition-colors max-w-[220px] truncate'
				>
					<MapPin size={14} className='text-[var(--color-brand-accent)] flex-shrink-0' />
					<span className='truncate text-xs'>{locationLabel}</span>
				</button>

				{/* Right: Actions */}
				<div className='flex items-center gap-1.5'>
					{/* Search (mobile) */}
					<button
						type='button'
						onClick={() => setIsSearchOpen(true)}
						className='md:hidden p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
					>
						<Search size={20} />
					</button>

					{/* Notifications */}
					<button
						type='button'
						onClick={() => setNotificationSheetOpen(true)}
						className='relative p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
					>
						<Bell size={20} />
						{unreadCount > 0 && (
							<span className='absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-brand-accent)] rounded-full' />
						)}
					</button>

					{/* Cart (desktop) */}
					<Link
						to='/consumer/cart'
						className={cn(
							'hidden sm:flex relative p-2 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors',
						)}
					>
						<ShoppingCart size={20} />
						{totalItems > 0 && (
							<span className='absolute top-1 right-1 min-w-[16px] h-4 bg-[var(--color-brand-accent)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5'>
								{totalItems > 9 ? '9+' : totalItems}
							</span>
						)}
					</Link>

				{/* Avatar */}
				<Link to='/consumer/profile'>
					<Avatar className='w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-[var(--color-brand-accent)] transition-all'>
						<AvatarImage src={user?.profilePictureUrl ?? undefined} alt={avatarName} />
						<AvatarFallback>{avatarName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
					</Avatar>
				</Link>
				</div>
			</div>
		</header>
	)
}
