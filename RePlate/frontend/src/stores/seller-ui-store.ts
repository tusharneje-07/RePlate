import { create } from 'zustand'

interface SellerUIState {
	// Sidebar
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void

	// Mobile sheets / drawers
	createListingOpen: boolean
	setCreateListingOpen: (open: boolean) => void

	qrScannerOpen: boolean
	setQrScannerOpen: (open: boolean) => void
	qrScanOrderId: string | null
	setQrScanOrderId: (id: string | null) => void

	// AI pricing sheet
	aiPricingOpen: boolean
	setAiPricingOpen: (open: boolean) => void
	aiPricingListingId: string | null
	setAiPricingListingId: (id: string | null) => void

	// Onboarding
	onboardingStep: number
	setOnboardingStep: (step: number) => void
}

export const useSellerUIStore = create<SellerUIState>((set) => ({
	sidebarOpen: true,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

	createListingOpen: false,
	setCreateListingOpen: (open) => set({ createListingOpen: open }),

	qrScannerOpen: false,
	setQrScannerOpen: (open) => set({ qrScannerOpen: open }),
	qrScanOrderId: null,
	setQrScanOrderId: (id) => set({ qrScanOrderId: id }),

	aiPricingOpen: false,
	setAiPricingOpen: (open) => set({ aiPricingOpen: open }),
	aiPricingListingId: null,
	setAiPricingListingId: (id) => set({ aiPricingListingId: id }),

	onboardingStep: 0,
	setOnboardingStep: (step) => set({ onboardingStep: step }),
}))
