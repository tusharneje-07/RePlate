import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SellerListing, SellerOrder, SellerNotification, SellerOrderStatus } from '@/types'
import {
	mockSellerListings,
	mockSellerOrders,
	mockSellerNotifications,
} from '@/data/seller-mock'

interface SellerState {
	// Listings
	listings: SellerListing[]
	addListing: (listing: SellerListing) => void
	updateListing: (id: string, updates: Partial<SellerListing>) => void
	deleteListing: (id: string) => void
	pauseListing: (id: string) => void
	restockListing: (id: string, quantity: number) => void

	// Orders
	orders: SellerOrder[]
	updateOrderStatus: (id: string, status: SellerOrderStatus) => void
	getOrderById: (id: string) => SellerOrder | undefined

	// Notifications
	notifications: SellerNotification[]
	unreadCount: number
	markNotificationRead: (id: string) => void
	markAllRead: () => void

	// UI state
	selectedOrderTab: SellerOrderStatus | 'all'
	setSelectedOrderTab: (tab: SellerOrderStatus | 'all') => void
}

export const useSellerStore = create<SellerState>()(
	persist(
		(set, get) => ({
			// Listings
			listings: mockSellerListings,

			addListing: (listing) =>
				set((s) => ({ listings: [listing, ...s.listings] })),

			updateListing: (id, updates) =>
				set((s) => ({
					listings: s.listings.map((l) =>
						l.id === id ? { ...l, ...updates, updatedAt: new Date().toISOString() } : l,
					),
				})),

			deleteListing: (id) =>
				set((s) => ({ listings: s.listings.filter((l) => l.id !== id) })),

			pauseListing: (id) =>
				set((s) => ({
					listings: s.listings.map((l) =>
						l.id === id
							? { ...l, status: l.status === 'paused' ? 'active' : 'paused', updatedAt: new Date().toISOString() }
							: l,
					),
				})),

			restockListing: (id, quantity) =>
				set((s) => ({
					listings: s.listings.map((l) =>
						l.id === id
							? {
									...l,
									quantityAvailable: l.quantityAvailable + quantity,
									totalQuantity: l.totalQuantity + quantity,
									status: 'active',
									updatedAt: new Date().toISOString(),
								}
							: l,
					),
				})),

			// Orders
			orders: mockSellerOrders,

			updateOrderStatus: (id, status) =>
				set((s) => ({
					orders: s.orders.map((o) =>
						o.id === id
							? {
									...o,
									status,
									updatedAt: new Date().toISOString(),
									...(status === 'confirmed' ? { confirmedAt: new Date().toISOString() } : {}),
									...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
								}
							: o,
					),
				})),

			getOrderById: (id) => get().orders.find((o) => o.id === id),

			// Notifications
			notifications: mockSellerNotifications,
			unreadCount: mockSellerNotifications.filter((n) => !n.isRead).length,

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

			// UI
			selectedOrderTab: 'all',
			setSelectedOrderTab: (tab) => set({ selectedOrderTab: tab }),
		}),
		{ name: 'replate-seller' },
	),
)
