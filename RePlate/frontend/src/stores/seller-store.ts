import { create } from 'zustand'
import type {
	SellerAnalytics,
	SellerListing,
	SellerNotification,
	SellerOrder,
	SellerOrderStatus,
	SellerProfile,
	SellerReview,
} from '@/types'
import { authApi, profileApi, sellerApi } from '@/lib/api'
import {
	mapSellerAnalyticsOutToSellerAnalytics,
	mapSellerListingOutToSellerListing,
	mapSellerNotificationOutToSellerNotification,
	mapSellerOrderOutToSellerOrder,
	mapSellerProfile,
	mapSellerReviewOutToSellerReview,
} from '@/lib/mappers'

interface SellerState {
	listings: SellerListing[]
	orders: SellerOrder[]
	notifications: SellerNotification[]
	unreadCount: number
	analytics: SellerAnalytics | null
	reviews: SellerReview[]
	profile: SellerProfile | null
	isHydrating: boolean
	hasHydrated: boolean
	error: string | null

	hydrate: () => Promise<void>
	refreshListings: () => Promise<void>
	refreshOrders: () => Promise<void>
	refreshNotifications: () => Promise<void>
	refreshAnalytics: () => Promise<void>
	refreshReviews: () => Promise<void>
	refreshProfile: () => Promise<void>

	addListing: (listing: Partial<SellerListing>) => Promise<void>
	updateListing: (id: string, updates: Partial<SellerListing>) => Promise<void>
	deleteListing: (id: string) => Promise<void>
	pauseListing: (id: string) => Promise<void>
	restockListing: (id: string, quantity: number) => Promise<void>
	requestInspection: (id: string) => Promise<void>

	updateOrderStatus: (id: string, status: SellerOrderStatus) => Promise<void>
	getOrderById: (id: string) => SellerOrder | undefined

	markNotificationRead: (id: string) => Promise<void>
	markAllRead: () => Promise<void>

	selectedOrderTab: SellerOrderStatus | 'all'
	setSelectedOrderTab: (tab: SellerOrderStatus | 'all') => void
}

function listingPayloadFromState(listing: Partial<SellerListing>) {
	return {
		name: listing.name,
		description: listing.description,
		images: listing.images,
		category: listing.category,
		dietary_tags: listing.dietaryTags,
		allergens: listing.allergens,
		original_price: listing.originalPrice,
		discounted_price: listing.discountedPrice,
		discount_percent: listing.discountPercent,
		total_quantity: listing.totalQuantity,
		quantity_available: listing.quantityAvailable,
		unit: listing.unit,
		pickup_start: listing.pickupStart,
		pickup_end: listing.pickupEnd,
		expires_at: listing.expiresAt,
		status: listing.status,
		co2_saved_per_unit: listing.co2SavedPerUnit,
	}
}

export const useSellerStore = create<SellerState>()((set, get) => ({
	listings: [],
	orders: [],
	notifications: [],
	unreadCount: 0,
	analytics: null,
	reviews: [],
	profile: null,
	isHydrating: false,
	hasHydrated: false,
	error: null,

	refreshListings: async () => {
		const { data } = await sellerApi.listListings()
		set({ listings: data.map(mapSellerListingOutToSellerListing) })
	},

	refreshOrders: async () => {
		const { data } = await sellerApi.listOrders({ limit: 200 })
		set({ orders: data.map(mapSellerOrderOutToSellerOrder) })
	},

	refreshNotifications: async () => {
		const { data } = await sellerApi.listNotifications({ limit: 200 })
		set({
			notifications: data.notifications.map(mapSellerNotificationOutToSellerNotification),
			unreadCount: data.unread_count,
		})
	},

	refreshAnalytics: async () => {
		const { data } = await sellerApi.getAnalytics()
		set({ analytics: mapSellerAnalyticsOutToSellerAnalytics(data) })
	},

	refreshReviews: async () => {
		const { data } = await sellerApi.listReviews({ limit: 200 })
		set({ reviews: data.reviews.map(mapSellerReviewOutToSellerReview) })
	},

	refreshProfile: async () => {
		const [{ data: me }, { data: profile }] = await Promise.all([
			authApi.me(),
			profileApi.getSellerProfile(),
		])
		const analytics = get().analytics ?? undefined
		set({ profile: mapSellerProfile(me, profile, analytics) })
	},

	hydrate: async () => {
		if (get().isHydrating) return
		set({ isHydrating: true, error: null })
		try {
			const results = await Promise.allSettled([
				get().refreshListings(),
				get().refreshOrders(),
				get().refreshNotifications(),
				get().refreshAnalytics(),
				get().refreshReviews(),
			])

			const profileResult = await Promise.allSettled([get().refreshProfile()])
			const hasFailure = [...results, ...profileResult].some((r) => r.status === 'rejected')

			set({
				hasHydrated: true,
				error: hasFailure ? 'Some seller data failed to load. Please refresh.' : null,
			})
		} finally {
			set({ isHydrating: false })
		}
	},

	addListing: async (listing) => {
		const { data } = await sellerApi.createListing(listingPayloadFromState(listing))
		set((state) => ({ listings: [mapSellerListingOutToSellerListing(data), ...state.listings] }))
		await get().refreshAnalytics()
	},

	updateListing: async (id, updates) => {
		const { data } = await sellerApi.updateListing(id, listingPayloadFromState(updates))
		set((state) => ({
			listings: state.listings.map((listing) =>
				listing.id === id ? mapSellerListingOutToSellerListing(data) : listing,
			),
		}))
		await get().refreshAnalytics()
	},

	deleteListing: async (id) => {
		await sellerApi.deleteListing(id)
		set((state) => ({ listings: state.listings.filter((listing) => listing.id !== id) }))
		await get().refreshAnalytics()
	},

	pauseListing: async (id) => {
		const listing = get().listings.find((item) => item.id === id)
		if (!listing) return
		const nextStatus = listing.status === 'paused' ? 'active' : 'paused'
		const { data } = await sellerApi.updateListing(id, { status: nextStatus })
		set((state) => ({
			listings: state.listings.map((item) =>
				item.id === id ? mapSellerListingOutToSellerListing(data) : item,
			),
		}))
	},

	restockListing: async (id, quantity) => {
		const listing = get().listings.find((item) => item.id === id)
		if (!listing) return
		await get().updateListing(id, {
			quantityAvailable: listing.quantityAvailable + quantity,
			totalQuantity: listing.totalQuantity + quantity,
			status: 'active',
		})
	},

	requestInspection: async (id) => {
		await sellerApi.requestInspection(id)
		// Optimistically update moderationStatus to pending_inspection and pause the listing
		set((state) => ({
			listings: state.listings.map((item) =>
				item.id === id
					? { ...item, moderationStatus: 'pending_inspection' as const, status: 'paused' as const }
					: item,
			),
		}))
	},

	updateOrderStatus: async (id, status) => {
		const { data } = await sellerApi.updateOrderStatus(id, { status })
		set((state) => ({
			orders: state.orders.map((order) =>
				order.id === id ? mapSellerOrderOutToSellerOrder(data) : order,
			),
		}))
		await get().refreshAnalytics()
		await get().refreshNotifications()
	},

	getOrderById: (id) => get().orders.find((order) => order.id === id),

	markNotificationRead: async (id) => {
		const { data } = await sellerApi.markNotificationRead(id)
		set((state) => ({
			notifications: state.notifications.map((item) =>
				item.id === id ? mapSellerNotificationOutToSellerNotification(data.notification) : item,
			),
			unreadCount: data.unread_count,
		}))
	},

	markAllRead: async () => {
		await sellerApi.markAllNotificationsRead()
		set((state) => ({
			notifications: state.notifications.map((item) => ({ ...item, isRead: true })),
			unreadCount: 0,
		}))
	},

	selectedOrderTab: 'all',
	setSelectedOrderTab: (tab) => set({ selectedOrderTab: tab }),
}))
