import { create } from 'zustand'

interface UIState {
	// Sidebar
	sidebarOpen: boolean
	setSidebarOpen: (open: boolean) => void
	toggleSidebar: () => void

	// Mobile sheets
	filterSheetOpen: boolean
	setFilterSheetOpen: (open: boolean) => void
	notificationSheetOpen: boolean
	setNotificationSheetOpen: (open: boolean) => void

	// Search
	searchQuery: string
	setSearchQuery: (q: string) => void
	isSearchOpen: boolean
	setIsSearchOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
	sidebarOpen: true,
	setSidebarOpen: (open) => set({ sidebarOpen: open }),
	toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

	filterSheetOpen: false,
	setFilterSheetOpen: (open) => set({ filterSheetOpen: open }),

	notificationSheetOpen: false,
	setNotificationSheetOpen: (open) => set({ notificationSheetOpen: open }),

	searchQuery: '',
	setSearchQuery: (q) => set({ searchQuery: q }),
	isSearchOpen: false,
	setIsSearchOpen: (open) => set({ isSearchOpen: open }),
}))
