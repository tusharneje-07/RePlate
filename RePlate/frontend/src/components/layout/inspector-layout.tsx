import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { InspectorNavbar } from './inspector-navbar'
import { InspectorSidebar } from './inspector-sidebar'
import { InspectorMobileBottomNav } from './inspector-mobile-bottom-nav'

export function InspectorLayout() {
	const location = useLocation()

	return (
		<div className='flex h-dvh bg-[var(--color-inspector-bg)] text-[var(--color-inspector-text-primary)] font-[var(--font-body)] overflow-hidden'>
			<InspectorSidebar />

			<div className='flex-1 flex flex-col min-w-0 relative'>
				<InspectorNavbar />

				<main className='flex-1 overflow-y-auto no-scrollbar scroll-smooth relative'>
					<AnimatePresence mode='wait'>
						<motion.div
							key={location.pathname}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -8 }}
							transition={{ duration: 0.2 }}
							className='min-h-full pb-20 lg:pb-8'
						>
							<Outlet />
						</motion.div>
					</AnimatePresence>
				</main>
			</div>

			<InspectorMobileBottomNav />
		</div>
	)
}
