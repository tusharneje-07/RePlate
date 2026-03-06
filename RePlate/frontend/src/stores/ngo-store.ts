import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NGOProfile, Donation, NGOPickup, NGONotification } from '@/types'
import {
	mockNGOProfile,
	mockDonations,
	mockPickups,
	mockPickupHistory,
	mockNGONotifications,
} from '@/data/ngo-mock'

interface NGOState {
	// Profile
	profile: NGOProfile
	updateProfile: (updates: Partial<NGOProfile>) => void

	// Donations (available to claim)
	donations: Donation[]
	claimDonation: (donationId: string) => void

	// Pickups (active)
	pickups: NGOPickup[]
	addPickup: (pickup: NGOPickup) => void
	updatePickupStatus: (pickupId: string, status: NGOPickup['status']) => void
	completePickup: (pickupId: string, mealsServed: number, target: string, notes: string) => void
	cancelPickup: (pickupId: string) => void

	// History (completed pickups)
	history: NGOPickup[]

	// Notifications
	notifications: NGONotification[]
	unreadCount: number
	markNotificationRead: (id: string) => void
	markAllRead: () => void
}

export const useNGOStore = create<NGOState>()(
	persist(
		(set) => ({
			// ── Profile ─────────────────────────────────────────
			profile: mockNGOProfile,
			updateProfile: (updates) =>
				set((s) => ({ profile: { ...s.profile, ...updates } })),

			// ── Donations ────────────────────────────────────────
			donations: mockDonations,
			claimDonation: (donationId) =>
				set((s) => ({
					donations: s.donations.map((d) =>
						d.id === donationId ? { ...d, status: 'claimed', claimedBy: s.profile.id, claimedAt: new Date().toISOString() } : d,
					),
				})),

			// ── Pickups ──────────────────────────────────────────
			pickups: mockPickups,
			addPickup: (pickup) =>
				set((s) => ({ pickups: [...s.pickups, pickup] })),
			updatePickupStatus: (pickupId, status) =>
				set((s) => ({
					pickups: s.pickups.map((p) =>
						p.id === pickupId ? { ...p, status } : p,
					),
				})),
			completePickup: (pickupId, mealsServed, target, notes) =>
				set((s) => {
					const pickup = s.pickups.find((p) => p.id === pickupId)
					if (!pickup) return {}
					const completed: NGOPickup = {
						...pickup,
						status: 'completed',
						actualPickupTime: new Date().toISOString(),
						mealsServed,
						redistributionTarget: target,
						redistributionNotes: notes,
						redistributionCompletedAt: new Date().toISOString(),
					}
					return {
						pickups: s.pickups.filter((p) => p.id !== pickupId),
						history: [completed, ...s.history],
						profile: {
							...s.profile,
							totalPickupsCompleted: s.profile.totalPickupsCompleted + 1,
							totalFoodRescuedKg: s.profile.totalFoodRescuedKg + (pickup.donation.quantityKg ?? 0),
							totalMealsServed: s.profile.totalMealsServed + mealsServed,
							totalCo2PreventedKg:
								s.profile.totalCo2PreventedKg + (pickup.donation.co2SavedKg ?? 0),
						},
					}
				}),
			cancelPickup: (pickupId) =>
				set((s) => ({
					pickups: s.pickups.filter((p) => p.id !== pickupId),
					// Restore donation to available
					donations: s.donations.map((d) =>
						d.id === s.pickups.find((p) => p.id === pickupId)?.donationId
							? { ...d, status: 'available', claimedBy: undefined, claimedAt: undefined }
							: d,
					),
				})),

			// ── History ──────────────────────────────────────────
			history: mockPickupHistory,

			// ── Notifications ────────────────────────────────────
			notifications: mockNGONotifications,
			unreadCount: mockNGONotifications.filter((n) => !n.isRead).length,
			markNotificationRead: (id) =>
				set((s) => {
					const updated = s.notifications.map((n) =>
						n.id === id ? { ...n, isRead: true } : n,
					)
					return {
						notifications: updated,
						unreadCount: updated.filter((n) => !n.isRead).length,
					}
				}),
			markAllRead: () =>
				set((s) => ({
					notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
					unreadCount: 0,
				})),
		}),
		{
			name: 'ngo-store',
			// Only persist profile and history; donations/notifications refresh from API
			partialize: (s) => ({
				profile: s.profile,
				history: s.history,
			}),
		},
	),
)
