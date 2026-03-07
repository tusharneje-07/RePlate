import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { NGONavbar } from './ngo-navbar'
import { NGOSidebar } from './ngo-sidebar'
import { NGOMobileBottomNav } from './ngo-mobile-bottom-nav'
import { useNGOStore } from '@/stores/ngo-store'

export function NGOLayout() {
	const location = useLocation()
	const initialize = useNGOStore((s) => s.initialize)

	useEffect(() => {
		initialize()
	}, [initialize])

	return (
		<div className='flex h-dvh bg-[var(--color-ngo-bg)] text-[var(--color-ngo-text-primary)] font-[var(--font-body)] overflow-hidden'>
			<NGOSidebar />

			{/* Main Content Area */}
			<div className='flex-1 flex flex-col min-w-0 relative'>
				<NGONavbar />

				<main className='flex-1 overflow-y-auto no-scrollbar scroll-smooth relative'>
					<AnimatePresence mode='wait'>
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -10 }}
							transition={{ duration: 0.2 }}
							className='min-h-full pb-20 lg:pb-8'
						>
							<Outlet />
						</motion.div>
					</AnimatePresence>
				</main>
			</div>

			<NGOMobileBottomNav />
		</div>
	)
}