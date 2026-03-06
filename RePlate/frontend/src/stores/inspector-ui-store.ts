import { create } from 'zustand'

interface InspectorUIFilters {
	region: string
	foodType: string
	urgency: string
	minSellerRating: number
	riskFlag: string
}

interface InspectorUIState {
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void

	selectedListingId: string | null
	setSelectedListingId: (id: string | null) => void

	selectedComplaintId: string | null
	setSelectedComplaintId: (id: string | null) => void

	verificationPanelOpen: boolean
	setVerificationPanelOpen: (open: boolean) => void

	complaintDrawerOpen: boolean
	setComplaintDrawerOpen: (open: boolean) => void

	newInspectionModalOpen: boolean
	setNewInspectionModalOpen: (open: boolean) => void

	searchQuery: string
	setSearchQuery: (query: string) => void

	filters: InspectorUIFilters
	updateFilters: (updates: Partial<InspectorUIFilters>) => void
	resetFilters: () => void
}

const defaultFilters: InspectorUIFilters = {
	region: 'all',
	foodType: 'all',
	urgency: 'all',
	minSellerRating: 0,
	riskFlag: 'all',
}

export const useInspectorUIStore = create<InspectorUIState>((set) => ({
	sidebarOpen: true,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

	selectedListingId: null,
	setSelectedListingId: (id) => set({ selectedListingId: id }),

	selectedComplaintId: null,
	setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),

	verificationPanelOpen: false,
	setVerificationPanelOpen: (open) => set({ verificationPanelOpen: open }),

	complaintDrawerOpen: false,
	setComplaintDrawerOpen: (open) => set({ complaintDrawerOpen: open }),

	newInspectionModalOpen: false,
	setNewInspectionModalOpen: (open) => set({ newInspectionModalOpen: open }),

	searchQuery: '',
	setSearchQuery: (query) => set({ searchQuery: query }),

	filters: defaultFilters,
	updateFilters: (updates) =>
		set((state) => ({
			filters: { ...state.filters, ...updates },
		})),
	resetFilters: () => set({ filters: defaultFilters }),
}))
