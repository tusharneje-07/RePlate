import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NGOProfile, Donation, NGOPickup, NGONotification } from '@/types'
import { ngoApi, type DonationListingOut, type NGOPickupOut, type NGOProfileOut, type NGONotificationOut } from '@/lib/api'

// ── Adapters: real API shapes → frontend types ─────────────────

function adaptProfile(p: NGOProfileOut): NGOProfile {
	return {
		id: p.id,
		organizationName: p.organization_name ?? 'NGO',
		registrationNumber: p.registration_number ?? '',
		category: 'food_bank', // default category
		contactPerson: p.contact_person_name ?? '',
		email: p.email,
		phone: p.phone ?? '',
		logo: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=200&h=200&fit=crop', // default logo
		coverImage: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=300&fit=crop', // default cover
		description: p.mission_statement ?? '',
		address: p.address ?? '',
		city: p.city ?? '',
		pincode: p.postal_code ?? '',
		location: p.latitude && p.longitude ? { lat: p.latitude, lng: p.longitude } : { lat: 19.0748, lng: 72.8856 },
		serviceAreas: [],
		operatingHours: { open: p.open_time ?? '07:00', close: p.close_time ?? '21:00' },
		closedDays: Array.isArray(p.closed_days) ? p.closed_days : [],
		pickupCapacityKg: p.serving_capacity ?? 100,
		vehicleType: (p.vehicle_type as NGOProfile['vehicleType']) ?? 'bicycle',
		verificationStatus: (p.verification_status as NGOProfile['verificationStatus']) ?? 'pending',
		ngoRegistrationDoc: p.document_url ?? '',
		panNumber: '',
		totalFoodRescuedKg: 0, // TODO: Get from analytics API
		totalMealsServed: 0, // TODO: Get from analytics API
		totalCo2PreventedKg: 0, // TODO: Get from analytics API
		totalPickupsCompleted: 0, // TODO: Get from analytics API
		memberSince: new Date().toISOString(),
		rating: 0,
		reviewCount: 0,
	}
}

function computeUrgency(expiresAt: string | null): Donation['urgency'] {
	if (!expiresAt) return 'low'
	const hoursLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
	if (hoursLeft <= 3) return 'critical'
	if (hoursLeft <= 6) return 'high'
	if (hoursLeft <= 12) return 'medium'
	return 'low'
}

function adaptDonationListing(d: DonationListingOut): Donation {
	const distanceM = d.distance_from_ngo != null ? d.distance_from_ngo * 1000 : 3000
	const qtyKg = d.quantity_available
	const servings = Math.round(qtyKg * 4) // rough estimate

	// Parse storage/packaging from tags (format: "storage:refrigerated", "packaging:sealed")
	const tags = d.tags ?? []
	const storageTag = tags.find((t) => t.startsWith('storage:'))
	const packagingTag = tags.find((t) => t.startsWith('packaging:'))
	const storageType = storageTag ? storageTag.replace('storage:', '') : 'room_temp'
	const packagingCondition = packagingTag ? packagingTag.replace('packaging:', '') : 'containers'

	// Dietary tag: first tag that is NOT a storage/packaging entry
	const dietaryTag = tags.find((t) => !t.startsWith('storage:') && !t.startsWith('packaging:')) ?? 'veg'

	return {
		id: d.id,
		donorId: d.seller_id,
		donorName: d.seller_name ?? 'Unknown Donor',
		donorType: d.donor_role === 'consumer' ? 'consumer' : 'seller',
		donorAddress: d.seller_address ?? '',
		donorPhone: '',
		donorLocation: { lat: 19.0748, lng: 72.8856 }, // default Mumbai if no coords
		foodName: d.title,
		description: d.description ?? '',
		category: d.category as Donation['category'],
		dietaryTag: dietaryTag as Donation['dietaryTag'],
		quantityKg: qtyKg,
		servings,
		images: d.images && d.images.length > 0 ? d.images : ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'],
		cookedAt: d.created_at,
		expiresAt: d.expires_at ?? new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
		pickupStart: d.pickup_start ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		pickupEnd: d.pickup_end ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
		storageType: storageType as Donation['storageType'],
		packagingCondition: packagingCondition as Donation['packagingCondition'],
		hygieneConfirmed: true,
		status: 'available',
		urgency: computeUrgency(d.expires_at),
		distance: distanceM,
		co2SavedKg: Math.round(qtyKg * 2.5),
		listedAt: d.created_at,
	}
}

function adaptPickup(p: NGOPickupOut): NGOPickup {
	const qtyKg = p.listing_quantity ?? 0
	const servings = Math.round(qtyKg * 4)

	const donationData: Donation = {
		id: p.listing_id ?? p.donation_request_id ?? p.id,
		donorId: p.seller_id,
		donorName: p.seller_name ?? 'Donor',
		donorType: 'seller',
		donorAddress: p.seller_address ?? '',
		donorPhone: '',
		donorLocation: {
			lat: p.seller_lat ?? 19.0748,
			lng: p.seller_lng ?? 72.8856,
		},
		foodName: p.listing_title ?? 'Food Pickup',
		description: p.listing_description ?? '',
		category: (p.listing_category as Donation['category']) ?? 'meals',
		dietaryTag: 'veg',
		quantityKg: qtyKg,
		servings,
		images:
			p.listing_images && p.listing_images.length > 0
				? p.listing_images
				: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop'],
		cookedAt: p.created_at,
		expiresAt:
			p.listing_expires_at ?? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
		pickupStart:
			p.listing_pickup_start ?? p.pickup_time ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		pickupEnd:
			p.listing_pickup_end ?? p.pickup_time ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
		storageType: 'room_temp',
		packagingCondition: 'containers',
		hygieneConfirmed: true,
		status: p.pickup_status === 'completed' ? 'completed' : 'claimed',
		urgency: computeUrgency(p.listing_expires_at),
		distance: 3000,
		co2SavedKg: Math.round(qtyKg * 2.5),
		listedAt: p.created_at,
	}

	return {
		id: p.id,
		donationId: p.donation_request_id ?? p.id,
		donation: donationData,
		ngoId: '',
		scheduledAt: p.pickup_time ?? p.created_at,
		status: p.pickup_status as NGOPickup['status'],
		priority: 'normal',
		verificationCode: p.pickup_code,
		qrCode: p.pickup_code,
	}
}

function adaptNotification(n: NGONotificationOut): NGONotification {
	return {
		id: n.id,
		type: n.event_type as NGONotification['type'],
		title: n.title,
		message: n.message,
		isRead: n.is_read,
		createdAt: n.created_at,
		actionUrl: n.reference_id ? `/ngo/discover` : undefined,
	}
}

interface NGOState {
	// Profile
	profile: NGOProfile
	updateProfile: (updates: Partial<NGOProfile>) => void

	// Donations (available to claim)
	donations: Donation[]
	claimDonation: (donationId: string) => Promise<void>

	// Pickups (active)
	pickups: NGOPickup[]
	addPickup: (pickup: NGOPickup) => void
	updatePickupStatus: (pickupId: string, status: NGOPickup['status']) => void
	completePickup: (pickupId: string, mealsServed: number, target: string, notes: string) => Promise<void>
	cancelPickup: (pickupId: string) => void

	// History (completed pickups)
	history: NGOPickup[]

	// Notifications
	notifications: NGONotification[]
	unreadCount: number
	markNotificationRead: (id: string) => void
	markAllRead: () => void

	// Data loading
	isLoaded: boolean
	initialize: () => Promise<void>
	refreshDonations: () => Promise<void>
}

export const useNGOStore = create<NGOState>()(
	persist(
		(set, get) => ({
			// ── Profile ─────────────────────────────────────────
			profile: {
				id: '',
				organizationName: '',
				registrationNumber: '',
				category: 'food_bank',
				contactPerson: '',
				email: '',
				phone: '',
				logo: '',
				coverImage: '',
				description: '',
				address: '',
				city: '',
				pincode: '',
				location: { lat: 19.0748, lng: 72.8856 },
				serviceAreas: [],
				operatingHours: { open: '07:00', close: '21:00' },
				closedDays: [],
				pickupCapacityKg: 100,
				vehicleType: 'bicycle',
				verificationStatus: 'pending',
				ngoRegistrationDoc: '',
				panNumber: '',
				totalFoodRescuedKg: 0,
				totalMealsServed: 0,
				totalCo2PreventedKg: 0,
				totalPickupsCompleted: 0,
				memberSince: new Date().toISOString(),
				rating: 0,
				reviewCount: 0,
			},
			updateProfile: (updates) =>
				set((s) => ({ profile: { ...s.profile, ...updates } })),

		// ── Donations ────────────────────────────────────────
		donations: [],
		claimDonation: async (donationId) => {
			const donation = get().donations.find((d) => d.id === donationId)
			if (!donation) return
			// Optimistically mark as claimed in local state
			set((s) => ({
				donations: s.donations.map((d) =>
					d.id === donationId ? { ...d, status: 'claimed', claimedBy: s.profile.id, claimedAt: new Date().toISOString() } : d,
				),
			}))
			try {
				// Call backend: auto-approves and creates PickupRecord
				const res = await ngoApi.createDonationRequest({
					listing_id: donationId,
					requested_quantity: Math.max(1, Math.round(donation.quantityKg)),
				})
				const donationRequest = res.data

				// Build an NGOPickup from the returned request + donation details
				if (donationRequest.pickup_id && donationRequest.pickup_code) {
					const now = new Date().toISOString()
					const newPickup: NGOPickup = {
						id: donationRequest.pickup_id,
						donationId: donationRequest.id,
						donation: {
							...donation,
							status: 'claimed',
						},
						ngoId: donationRequest.ngo_id,
						scheduledAt: donationRequest.pickup_time ?? now,
						status: 'claimed',
						priority: 'normal',
						verificationCode: donationRequest.pickup_code,
						qrCode: donationRequest.pickup_code,
					}
					set((s) => ({
						pickups: [newPickup, ...s.pickups.filter((p) => p.donationId !== donationRequest.id)],
					}))
				}
			} catch {
				// Roll back optimistic update on failure
				set((s) => ({
					donations: s.donations.map((d) =>
						d.id === donationId ? { ...d, status: 'available', claimedBy: undefined, claimedAt: undefined } : d,
					),
				}))
			}
		},

			// ── Pickups ──────────────────────────────────────────
			pickups: [],
			addPickup: (pickup) =>
				set((s) => ({ pickups: [...s.pickups, pickup] })),
			updatePickupStatus: (pickupId, status) =>
				set((s) => ({
					pickups: s.pickups.map((p) =>
						p.id === pickupId ? { ...p, status } : p,
					),
				})),
		completePickup: async (pickupId, mealsServed, target, notes) => {
			const pickup = get().pickups.find((p) => p.id === pickupId)
			if (!pickup) return
			// Optimistically move to history
			const completed: NGOPickup = {
				...pickup,
				status: 'completed',
				actualPickupTime: new Date().toISOString(),
				mealsServed,
				redistributionTarget: target,
				redistributionNotes: notes,
				redistributionCompletedAt: new Date().toISOString(),
			}
			set((s) => ({
				pickups: s.pickups.filter((p) => p.id !== pickupId),
				history: [completed, ...s.history],
				profile: {
					...s.profile,
					totalPickupsCompleted: s.profile.totalPickupsCompleted + 1,
					totalFoodRescuedKg: s.profile.totalFoodRescuedKg + (pickup.donation.quantityKg ?? 0),
					totalMealsServed: s.profile.totalMealsServed + mealsServed,
					totalCo2PreventedKg: s.profile.totalCo2PreventedKg + (pickup.donation.co2SavedKg ?? 0),
				},
			}))
			try {
				await ngoApi.completePickup(pickupId)
			} catch {
				// Roll back: restore pickup to active, remove from history
				set((s) => ({
					pickups: [...s.pickups, pickup],
					history: s.history.filter((p) => p.id !== pickupId),
					profile: {
						...s.profile,
						totalPickupsCompleted: s.profile.totalPickupsCompleted - 1,
						totalFoodRescuedKg: s.profile.totalFoodRescuedKg - (pickup.donation.quantityKg ?? 0),
						totalMealsServed: s.profile.totalMealsServed - mealsServed,
						totalCo2PreventedKg: s.profile.totalCo2PreventedKg - (pickup.donation.co2SavedKg ?? 0),
					},
				}))
			}
		},
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
			history: [],

			// ── Notifications ────────────────────────────────────
			notifications: [],
			unreadCount: 0,
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

			// ── Data loading ─────────────────────────────────────
			isLoaded: false,
			initialize: async () => {
				if (get().isLoaded) return
				try {
					// NOTE: donations are intentionally NOT fetched here.
					// Each page that needs donations calls refreshDonations() on mount.
					// Fetching here would race with refreshDonations() and the loser
					// would overwrite the winner's result, causing missing listings.
					const [profileRes, pickupsRes, notificationsRes] = await Promise.allSettled([
						ngoApi.getProfile(),
						ngoApi.listPickups({ limit: 50 }),
						ngoApi.listNotifications({ limit: 30 }),
					])

					const updates: Partial<NGOState> = { isLoaded: true }

					if (profileRes.status === 'fulfilled') {
						updates.profile = adaptProfile(profileRes.value.data)
					}

					if (pickupsRes.status === 'fulfilled') {
						const raw = pickupsRes.value.data
						const pickupRows: NGOPickupOut[] = Array.isArray(raw) ? raw : (raw as { data: NGOPickupOut[] }).data ?? []
						const active = pickupRows.filter((p) => p.pickup_status !== 'completed').map(adaptPickup)
						const done = pickupRows.filter((p) => p.pickup_status === 'completed').map(adaptPickup)
						updates.pickups = active
						updates.history = done
					}

					if (notificationsRes.status === 'fulfilled') {
						const raw = notificationsRes.value.data
						const notifRows: NGONotificationOut[] = Array.isArray(raw) ? raw : (raw as { data: NGONotificationOut[] }).data ?? []
						if (notifRows.length > 0) {
							const adapted = notifRows.map(adaptNotification)
							updates.notifications = adapted
							updates.unreadCount = adapted.filter((n) => !n.isRead).length
						}
					}

					set(updates as Partial<NGOState>)
				} catch {
					// Fall back silently — pages will show mock data
					set({ isLoaded: true })
				}
			},

			// ── Manual refresh (bypasses isLoaded guard) ─────────
			refreshDonations: async () => {
				try {
					const res = await ngoApi.browseDonations({ limit: 50 })
					const raw = res.data
					const listings: DonationListingOut[] = Array.isArray(raw) ? raw : (raw as { data: DonationListingOut[] }).data ?? []
					set({ donations: listings.map(adaptDonationListing) })
				} catch {
					// silently ignore — current donations remain displayed
				}
			},
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
