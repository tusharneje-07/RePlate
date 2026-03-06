import { Link, useLocation } from 'react-router-dom'
import { Bell, ChevronRight, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useInspectorStore } from '@/stores/inspector-store'

function getInspectorPageTitle(path: string) {
	if (path === '/inspector/dashboard') return 'Compliance Dashboard'
	if (path.startsWith('/inspector/listings')) return 'Listing Safety Monitoring'
	if (path.startsWith('/inspector/complaints')) return 'Complaints & Incidents'
	if (path.startsWith('/inspector/inspections')) return 'Field Inspections'
	if (path.startsWith('/inspector/history')) return 'Inspection History'
	if (path.startsWith('/inspector/impact')) return 'Safety Impact'
	if (path.startsWith('/inspector/profile')) return 'Inspector Profile'
	if (path.startsWith('/inspector/settings')) return 'Settings'
	return 'Inspector Portal'
}

export function InspectorNavbar() {
	const location = useLocation()
	const { profile, unreadCount } = useInspectorStore()

	return (
		<header className='sticky top-0 z-30 h-[64px] bg-[var(--color-inspector-surface)]/90 backdrop-blur-md border-b border-[var(--color-inspector-border)]'>
			<div className='flex h-full items-center justify-between px-4 md:px-6 gap-3'>
				<div className='flex items-center gap-3 min-w-0'>
					<Link to='/inspector/dashboard' className='lg:hidden flex items-center gap-2 min-w-0'>
						<div className='w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--color-inspector-accent)] flex items-center justify-center flex-shrink-0'>
							<ShieldCheck className='w-4 h-4 text-white' strokeWidth={2.4} />
						</div>
						<span className='font-[var(--font-display)] font-bold text-base text-[var(--color-inspector-text-primary)] truncate'>
							Inspector
						</span>
					</Link>

					<div className='hidden lg:flex items-center gap-2 text-sm text-[var(--color-inspector-text-muted)]'>
						<ShieldCheck size={14} className='text-[var(--color-inspector-accent)]' />
						<span>Inspector</span>
						<ChevronRight size={12} />
						<span className='font-semibold text-[var(--color-inspector-text-primary)]'>
							{getInspectorPageTitle(location.pathname)}
						</span>
					</div>
				</div>

				<div className='flex items-center gap-1.5'>
					<Link
						to='/inspector/complaints'
						className='relative p-2 rounded-[var(--radius-md)] text-[var(--color-inspector-text-muted)] hover:bg-[var(--color-inspector-surface-elevated)] hover:text-[var(--color-inspector-accent)] transition-colors'
					>
						<Bell size={20} />
						{unreadCount > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								className='absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-inspector-risk-critical)] rounded-full'
							/>
						)}
					</Link>

					<Link to='/inspector/profile'>
						<Avatar className='w-8 h-8 cursor-pointer ring-2 ring-transparent hover:ring-[var(--color-inspector-accent)] transition-all'>
							<AvatarImage src={profile.avatar} alt={profile.name} />
							<AvatarFallback className='bg-[var(--color-inspector-secondary)] text-[var(--color-inspector-accent)] font-bold text-xs'>
								{profile.name
									.split(' ')
									.map((item) => item[0])
									.join('')}
							</AvatarFallback>
						</Avatar>
					</Link>
				</div>
			</div>
		</header>
	)
}
