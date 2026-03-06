import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { SellerSidebar } from './seller-sidebar'
import { SellerNavbar } from './seller-navbar'
import { SellerMobileBottomNav } from './seller-mobile-bottom-nav'
import { useSellerStore } from '@/stores/seller-store'

export function SellerLayout() {
	const hydrate = useSellerStore((s) => s.hydrate)
	const hasHydrated = useSellerStore((s) => s.hasHydrated)

	useEffect(() => {
		if (!hasHydrated) {
			void hydrate()
		}
	}, [hasHydrated, hydrate])

	return (
		<div className='flex min-h-screen bg-[var(--color-seller-bg)]'>
			{/* Desktop Sidebar */}
			<SellerSidebar />

			{/* Main Content */}
			<div className='flex-1 flex flex-col min-w-0'>
				<SellerNavbar />

				<main className='flex-1 overflow-y-auto pb-20 lg:pb-6'>
					<div className='max-w-screen-xl mx-auto px-4 md:px-6 py-5'>
						<Outlet />
					</div>
				</main>
			</div>

			{/* Mobile Bottom Nav */}
			<SellerMobileBottomNav />
		</div>
	)
}
