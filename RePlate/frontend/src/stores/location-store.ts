import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface UserLocation {
	lat: number
	lng: number
	address: string
	city: string
	pincode: string
}

interface LocationState {
	location: UserLocation | null
	discoveryRadiusMeters: number
	isPickerOpen: boolean
	setLocation: (location: UserLocation) => void
	clearLocation: () => void
	setDiscoveryRadiusMeters: (radius: number) => void
	openPicker: () => void
	closePicker: () => void
}

export const useLocationStore = create<LocationState>()(
	persist(
		(set) => ({
			location: null,
			discoveryRadiusMeters: 5000,
			isPickerOpen: false,
			setLocation: (location) => set({ location, isPickerOpen: false }),
			clearLocation: () => set({ location: null }),
			setDiscoveryRadiusMeters: (radius) => set({ discoveryRadiusMeters: radius }),
			openPicker: () => set({ isPickerOpen: true }),
			closePicker: () => set({ isPickerOpen: false }),
		}),
		{
			name: 'replate-user-location',
			// Only persist the location, not the modal state
			partialize: (s) => ({ location: s.location, discoveryRadiusMeters: s.discoveryRadiusMeters }),
		},
	),
)
