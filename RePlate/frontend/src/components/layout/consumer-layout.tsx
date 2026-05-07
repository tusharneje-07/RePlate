import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Navbar } from './navbar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { FloatingCartBar } from '@/components/common/floating-cart-bar'
import { LocationPickerModal } from '@/components/common/location-picker-modal'
import { ConsumerNotificationSheet } from '@/components/common/consumer-notification-sheet'

interface ConsumerLayoutProps {
	title?: string
}

export function ConsumerLayout({ title }: ConsumerLayoutProps) {
	return (
		<div className='flex min-h-screen bg-[var(--color-surface-elevated)]'>
			{/* Desktop Sidebar */}
			<Sidebar />

			{/* Main Content */}
			<div className='flex-1 flex flex-col min-w-0'>
				<Navbar title={title} />

				<main className='flex-1 overflow-y-auto pb-20 lg:pb-6'>
					<div className='max-w-screen-xl mx-auto px-4 md:px-6 py-5'>
						<Outlet />
					</div>
				</main>
			</div>

			{/* Mobile Bottom Nav */}
			<MobileBottomNav />

		{/* Floating Cart Bar — shown when cart has items, except on cart/checkout */}
		<FloatingCartBar />

		{/* Location Picker Modal — globally available in consumer section */}
		<LocationPickerModal />

		{/* Notification Sheet — triggered by bell icon in navbar */}
		<ConsumerNotificationSheet />
	</div>
	)
}
