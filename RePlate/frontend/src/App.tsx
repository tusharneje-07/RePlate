import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

// ── Auth pages ──────────────────────────────────────────────
import { LoginPage } from '@/pages/auth/login'
import { AuthCallbackPage } from '@/pages/auth/callback'
import { SelectRolePage } from '@/pages/auth/select-role'

// ── Onboarding pages ────────────────────────────────────────
import { ConsumerOnboardingPage } from '@/pages/onboarding/consumer'

// ── Consumer module ─────────────────────────────────────────
import { ConsumerLayout } from '@/components/layout/consumer-layout'
import { DashboardPage } from '@/pages/consumer/dashboard'
import { BrowsePage } from '@/pages/consumer/browse'
import { FoodDetailPage } from '@/pages/consumer/food-detail'
import { CartPage } from '@/pages/consumer/cart'
import { CheckoutPage } from '@/pages/consumer/checkout'
import { OrdersPage } from '@/pages/consumer/orders'
import { OrderDetailPage } from '@/pages/consumer/order-detail'
import { FavoritesPage } from '@/pages/consumer/favorites'
import { ImpactPage } from '@/pages/consumer/impact'
import { ProfilePage } from '@/pages/consumer/profile'
import { SettingsPage } from '@/pages/consumer/settings'
import { ListFoodPage } from '@/pages/consumer/list-food'

// ── Seller Module ──────────────────────────────────────────────────────────────
import { SellerLayout } from '@/components/layout/seller-layout'
import { SellerDashboardPage } from '@/pages/seller/dashboard'
import { SellerListingsPage } from '@/pages/seller/listings'
import { SellerOrdersPage, SellerOrderDetailPage } from '@/pages/seller/orders'
import { SellerAnalyticsPage } from '@/pages/seller/analytics'
import { SellerNotificationsPage } from '@/pages/seller/notifications'
import { SellerReviewsPage } from '@/pages/seller/reviews'
import { SellerProfilePage } from '@/pages/seller/profile'
import { SellerSettingsPage } from '@/pages/seller/settings'
import { SellerOnboardingPage } from '@/pages/seller/onboarding'

// ── NGO Module ─────────────────────────────────────────────
import { NGOLayout } from '@/components/layout/ngo-layout'
import { NGOOnboardingPage } from '@/pages/ngo/onboarding'
import { NGODashboardPage } from '@/pages/ngo/dashboard'
import { NGODiscoverPage } from '@/pages/ngo/discover'
import { NGOPickupsPage } from '@/pages/ngo/pickups'
import { NGOPickupDetailPage } from '@/pages/ngo/pickup-detail'
import { NGOImpactPage } from '@/pages/ngo/impact'
import { NGONotificationsPage } from '@/pages/ngo/notifications'
import { NGOProfilePage } from '@/pages/ngo/profile'
import { NGOSettingsPage } from '@/pages/ngo/settings'

// ── Inspector Module ────────────────────────────────────────
import { InspectorLayout } from '@/components/layout/inspector-layout'
import { InspectorDashboardPage } from '@/pages/inspector/dashboard'
import { InspectorListingsPage } from '@/pages/inspector/listings'
import { InspectorListingDetailPage } from '@/pages/inspector/listing-detail'
import { InspectorComplaintsPage } from '@/pages/inspector/complaints'
import { InspectorComplaintDetailPage } from '@/pages/inspector/complaint-detail'
import { InspectorInspectionsPage } from '@/pages/inspector/inspections'
import { InspectorHistoryPage } from '@/pages/inspector/history'
import { InspectorImpactPage } from '@/pages/inspector/impact'
import { InspectorProfilePage } from '@/pages/inspector/profile'
import { InspectorSettingsPage } from '@/pages/inspector/settings'

// ── Auth guard ──────────────────────────────────────────────
/**
 * Wraps protected routes. While auth is loading shows a spinner.
 * If not authenticated redirects to /auth/login.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth()

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-[var(--color-surface-elevated)]'>
				<Loader2 size={24} className='animate-spin text-[var(--color-brand-accent)]' />
			</div>
		)
	}

	if (!isAuthenticated) {
		return <Navigate to='/auth/login' replace />
	}

	return <>{children}</>
}

// ── Onboarding guard ─────────────────────────────────────────
/**
 * Must be used inside AuthGuard (user is guaranteed to be loaded and authenticated).
 * If the user hasn't completed onboarding, redirects them to the correct onboarding
 * flow before they can access any module page. Inspector accounts are provisioned by
 * admins with is_onboarded=true so they are excluded from this guard.
 */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
	const { user } = useAuth()

	if (user && !user.isOnboarded && user.role) {
		const role = user.role.toLowerCase()
		// Inspector has no self-onboarding; admin provisions them as already onboarded
		if (role !== 'inspector' && role !== 'admin') {
			return <Navigate to={`/${role}/onboarding`} replace />
		}
	}

	return <>{children}</>
}

// ── Root redirect ───────────────────────────────────────────
/**
 * At the root "/" decide where to send the user based on their auth state.
 */
function RootRedirect() {
	const { isAuthenticated, isLoading, user } = useAuth()

	if (isLoading) {
		return (
			<div className='min-h-screen flex items-center justify-center bg-[var(--color-surface-elevated)]'>
				<Loader2 size={24} className='animate-spin text-[var(--color-brand-accent)]' />
			</div>
		)
	}

	if (!isAuthenticated) {
		return <Navigate to='/auth/login' replace />
	}

	if (!user?.role) {
		return <Navigate to='/auth/select-role' replace />
	}

	// If the user has a role but hasn't completed onboarding, send them there
	if (!user.isOnboarded) {
		return <Navigate to={`/${user.role.toLowerCase()}/onboarding`} replace />
	}

	return <Navigate to={`/${user.role.toLowerCase()}/dashboard`} replace />
}

export default function App() {
	return (
		<Routes>
			{/* Root — auth-aware redirect */}
			<Route path='/' element={<RootRedirect />} />

			{/* ── Public auth routes ── */}
			<Route path='/auth/login' element={<LoginPage />} />
			<Route path='/auth/callback' element={<AuthCallbackPage />} />
			<Route path='/auth/select-role' element={<SelectRolePage />} />

			{/* ── Short-form auth aliases ── */}
			<Route path='/login' element={<Navigate to='/auth/login' replace />} />
			<Route path='/callback' element={<Navigate to='/auth/callback' replace />} />
			<Route path='/select-role' element={<Navigate to='/auth/select-role' replace />} />

			{/* ── Onboarding aliases (alternate URL shapes) ── */}
			<Route path='/onboarding/consumer' element={<Navigate to='/consumer/onboarding' replace />} />
			<Route path='/onboarding/seller' element={<Navigate to='/seller/onboarding' replace />} />
			<Route path='/onboarding/ngo' element={<Navigate to='/ngo/onboarding' replace />} />

			{/* ── Onboarding routes (outside module layouts, auth required) ── */}
			<Route
				path='/consumer/onboarding'
				element={
					<AuthGuard>
						<ConsumerOnboardingPage />
					</AuthGuard>
				}
			/>
			{/* Seller Onboarding (outside layout — full screen flow) */}
			<Route
				path='/seller/onboarding'
				element={
					<AuthGuard>
						<SellerOnboardingPage />
					</AuthGuard>
				}
			/>
			{/* NGO Onboarding (outside layout — full screen flow) */}
			<Route
				path='/ngo/onboarding'
				element={
					<AuthGuard>
						<NGOOnboardingPage />
					</AuthGuard>
				}
			/>

		{/* ── Consumer module — wrapped in ConsumerLayout ── */}
		<Route
			path='/consumer'
			element={
				<AuthGuard>
					<OnboardingGuard>
						<ConsumerLayout />
					</OnboardingGuard>
				</AuthGuard>
			}
		>
				<Route index element={<Navigate to='/consumer/dashboard' replace />} />
				<Route path='dashboard' element={<DashboardPage />} />
				<Route path='browse' element={<BrowsePage />} />
				<Route path='food/:foodId' element={<FoodDetailPage />} />
				<Route path='cart' element={<CartPage />} />
				<Route path='checkout' element={<CheckoutPage />} />
				<Route path='orders' element={<OrdersPage />} />
				<Route path='orders/:orderId' element={<OrderDetailPage />} />
				<Route path='favorites' element={<FavoritesPage />} />
				<Route path='impact' element={<ImpactPage />} />
				<Route path='profile' element={<ProfilePage />} />
				<Route path='settings' element={<SettingsPage />} />
				<Route path='list-food' element={<ListFoodPage />} />
			</Route>

		{/* ── Seller module — wrapped in SellerLayout ── */}
		<Route
			path='/seller'
			element={
				<AuthGuard>
					<OnboardingGuard>
						<SellerLayout />
					</OnboardingGuard>
				</AuthGuard>
			}
		>
				<Route index element={<Navigate to='/seller/dashboard' replace />} />
				<Route path='dashboard' element={<SellerDashboardPage />} />
				<Route path='listings' element={<SellerListingsPage />} />
				<Route path='listings/new' element={<SellerListingsPage />} />
				<Route path='listings/:listingId' element={<SellerListingsPage />} />
				<Route path='orders' element={<SellerOrdersPage />} />
				<Route path='orders/:orderId' element={<SellerOrderDetailPage />} />
				<Route path='analytics' element={<SellerAnalyticsPage />} />
				<Route path='notifications' element={<SellerNotificationsPage />} />
				<Route path='reviews' element={<SellerReviewsPage />} />
				<Route path='profile' element={<SellerProfilePage />} />
				<Route path='settings' element={<SellerSettingsPage />} />
			</Route>

		{/* ── NGO module — wrapped in NGOLayout ── */}
		<Route
			path='/ngo'
			element={
				<AuthGuard>
					<OnboardingGuard>
						<NGOLayout />
					</OnboardingGuard>
				</AuthGuard>
			}
		>
				<Route index element={<Navigate to='/ngo/dashboard' replace />} />
				<Route path='dashboard' element={<NGODashboardPage />} />
				<Route path='discover' element={<NGODiscoverPage />} />
				<Route path='pickups' element={<NGOPickupsPage />} />
				<Route path='pickups/:pickupId' element={<NGOPickupDetailPage />} />
				<Route path='impact' element={<NGOImpactPage />} />
				<Route path='notifications' element={<NGONotificationsPage />} />
				<Route path='profile' element={<NGOProfilePage />} />
				<Route path='settings' element={<NGOSettingsPage />} />
			</Route>

		{/* ── Inspector module ── */}
		<Route
			path='/inspector'
			element={
				<AuthGuard>
					<OnboardingGuard>
						<InspectorLayout />
					</OnboardingGuard>
				</AuthGuard>
			}
		>
				<Route index element={<Navigate to='/inspector/dashboard' replace />} />
				<Route path='dashboard' element={<InspectorDashboardPage />} />
				<Route path='listings' element={<InspectorListingsPage />} />
				<Route path='listings/:listingId' element={<InspectorListingDetailPage />} />
				<Route path='complaints' element={<InspectorComplaintsPage />} />
				<Route path='complaints/:complaintId' element={<InspectorComplaintDetailPage />} />
				<Route path='inspections' element={<InspectorInspectionsPage />} />
				<Route path='history' element={<InspectorHistoryPage />} />
				<Route path='impact' element={<InspectorImpactPage />} />
				<Route path='profile' element={<InspectorProfilePage />} />
				<Route path='settings' element={<InspectorSettingsPage />} />
			</Route>

			{/* 404 fallback */}
			<Route
				path='*'
				element={
					<div className='min-h-screen bg-[var(--color-surface-elevated)] flex items-center justify-center px-4 py-10'>
						<div className='relative w-full max-w-2xl rounded-[var(--radius-2xl)] border border-[var(--color-border)] bg-white p-8 md:p-10 text-center shadow-[var(--shadow-elevated)] overflow-hidden'>
							<div className='absolute -top-20 -left-14 w-48 h-48 rounded-full bg-[var(--color-brand-accent-light)]/80 pointer-events-none' />
							<div className='absolute -bottom-24 -right-14 w-56 h-56 rounded-full bg-[var(--color-brand-secondary)]/45 pointer-events-none' />

							<div className='relative'>
								<p className='text-xs uppercase tracking-[0.18em] font-semibold text-[var(--color-text-muted)]'>Route Not Found</p>
								<h1 className='mt-2 text-5xl md:text-6xl font-[var(--font-display)] font-bold text-[var(--color-text-primary)]'>404</h1>
								<p className='mt-3 text-sm md:text-base text-[var(--color-text-secondary)] max-w-lg mx-auto'>
									This page does not exist or may have moved. Choose a module below to continue.
								</p>

								<div className='mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm'>
									<a href='/consumer/dashboard' className='h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-brand-accent-light)] text-[var(--color-text-primary)] font-medium inline-flex items-center justify-center transition-colors'>Consumer Dashboard</a>
									<a href='/seller/dashboard' className='h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-seller-accent-light)] text-[var(--color-text-primary)] font-medium inline-flex items-center justify-center transition-colors'>Seller Dashboard</a>
									<a href='/ngo/dashboard' className='h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-ngo-accent-light)] text-[var(--color-text-primary)] font-medium inline-flex items-center justify-center transition-colors'>NGO Dashboard</a>
									<a href='/inspector/dashboard' className='h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:bg-[var(--color-inspector-accent-light)] text-[var(--color-text-primary)] font-medium inline-flex items-center justify-center transition-colors'>Inspector Dashboard</a>
								</div>
							</div>
						</div>
					</div>
				}
			/>
		</Routes>
	)
}
