import { create } from 'zustand'

interface NGOUIState {
	// Sidebar
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void

	// Sheets / modals
	filterSheetOpen: boolean
	setFilterSheetOpen: (open: boolean) => void

	notificationSheetOpen: boolean
	setNotificationSheetOpen: (open: boolean) => void

	qrVerifyOpen: boolean
	setQrVerifyOpen: (open: boolean) => void
	qrVerifyPickupId: string | null
	setQrVerifyPickupId: (id: string | null) => void

	claimConfirmOpen: boolean
	setClaimConfirmOpen: (open: boolean) => void
	claimDonationId: string | null
	setClaimDonationId: (id: string | null) => void

	redistributionSheetOpen: boolean
	setRedistributionSheetOpen: (open: boolean) => void
	redistributionPickupId: string | null
	setRedistributionPickupId: (id: string | null) => void

	// Search
	searchQuery: string
	setSearchQuery: (q: string) => void

	// Onboarding
	onboardingStep: number
	setOnboardingStep: (step: number) => void
}

export const useNGOUIStore = create<NGOUIState>((set) => ({
	sidebarOpen: true,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

	filterSheetOpen: false,
	setFilterSheetOpen: (open) => set({ filterSheetOpen: open }),

	notificationSheetOpen: false,
	setNotificationSheetOpen: (open) => set({ notificationSheetOpen: open }),

	qrVerifyOpen: false,
	setQrVerifyOpen: (open) => set({ qrVerifyOpen: open }),
	qrVerifyPickupId: null,
	setQrVerifyPickupId: (id) => set({ qrVerifyPickupId: id }),

	claimConfirmOpen: false,
	setClaimConfirmOpen: (open) => set({ claimConfirmOpen: open }),
	claimDonationId: null,
	setClaimDonationId: (id) => set({ claimDonationId: id }),

	redistributionSheetOpen: false,
	setRedistributionSheetOpen: (open) => set({ redistributionSheetOpen: open }),
	redistributionPickupId: null,
	setRedistributionPickupId: (id) => set({ redistributionPickupId: id }),

	searchQuery: '',
	setSearchQuery: (q) => set({ searchQuery: q }),

	onboardingStep: 0,
	setOnboardingStep: (step) => set({ onboardingStep: step }),
}))
