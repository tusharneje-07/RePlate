import axios, { type AxiosError } from 'axios'

// ── Constants ─────────────────────────────────────────────────
export const TOKEN_KEY = 'replate_token'
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Axios instance ────────────────────────────────────────────
export const api = axios.create({
	baseURL: `${BASE_URL}/api/v1`,
	headers: { 'Content-Type': 'application/json' },
	timeout: 15_000,
})

// ── Request interceptor — attach token ────────────────────────
api.interceptors.request.use((config) => {
	const token = localStorage.getItem(TOKEN_KEY)
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// ── Response interceptor — handle 401 / 403 ──────────────────
api.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		const status = error.response?.status

		if (status === 401) {
			localStorage.removeItem(TOKEN_KEY)
			// Redirect to login only if not already there
			if (!window.location.pathname.startsWith('/auth')) {
				window.location.href = '/auth/login'
			}
		}

		if (status === 403) {
			// Decode the stored token to decide where to send the user.
			// 403 means the token is valid but the role is wrong for this endpoint.
			const token = localStorage.getItem(TOKEN_KEY)
			const payload = token ? decodeToken(token) : null
			const role = payload?.role as string | null | undefined

			if (!role) {
				// User never completed role selection — send them to pick a role.
				if (!window.location.pathname.startsWith('/auth')) {
					window.location.href = '/auth/select-role'
				}
			} else {
				// User has a role but is accessing a wrong-role endpoint
				// (e.g. a seller hitting a consumer-only route). Redirect to their dashboard.
				if (!window.location.pathname.startsWith(`/${role.toLowerCase()}`)) {
					window.location.href = `/${role.toLowerCase()}/dashboard`
				}
			}
		}

		return Promise.reject(error)
	},
)

// ── Token helpers ─────────────────────────────────────────────
export function getToken(): string | null {
	return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
	localStorage.removeItem(TOKEN_KEY)
}

/** Decode the JWT payload without verifying (client-side only). */
export function decodeToken(token: string): Record<string, unknown> | null {
	try {
		const [, payload] = token.split('.')
		return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
	} catch {
		return null
	}
}

export function isTokenExpired(token: string): boolean {
	const payload = decodeToken(token)
	if (!payload || typeof payload.exp !== 'number') return true
	return Date.now() / 1000 > payload.exp
}

// ── File upload ───────────────────────────────────────────────
/**
 * Upload a single file to the backend.
 * Returns the absolute public URL of the stored file.
 *
 * Accepted types: image/jpeg, image/png, image/webp, image/gif, application/pdf
 * Max size: 10 MB (enforced server-side; a 413 will be thrown for larger files)
 */
export async function uploadFile(file: File): Promise<string> {
	const form = new FormData()
	form.append('file', file)
	const response = await api.post<{ url: string }>('/uploads', form, {
		headers: { 'Content-Type': 'multipart/form-data' },
	})
	return response.data.url
}

// ── Auth API ──────────────────────────────────────────────────
export interface AuthorizeResponse {
	authorization_url: string
}

export interface TokenPayload {
	sub: string
	role: 'CONSUMER' | 'SELLER' | 'NGO' | 'INSPECTOR' | 'ADMIN' | null
	workos_id: string
	require_role_selection?: boolean
	iat: number
	exp: number
}

export interface MeResponse {
	id: string
	email: string
	first_name: string | null
	last_name: string | null
	role: 'CONSUMER' | 'SELLER' | 'NGO' | 'INSPECTOR' | 'ADMIN' | null
	profile_picture_url: string | null
	is_onboarded: boolean
	created_at: string
}

export interface LocalLoginResponse {
	access_token: string
	token_type: string
	user_id: string
	email: string
	role: 'CONSUMER' | 'SELLER' | 'NGO' | 'INSPECTOR' | 'ADMIN' | null
	is_onboarded: boolean
	requires_role_selection: boolean
}

export const authApi = {
	getAuthorizeUrl: (screenHint?: 'sign-in' | 'sign-up', state?: string) =>
		api.get<AuthorizeResponse>('/auth/authorize', {
			params: {
				...(screenHint ? { screen_hint: screenHint } : {}),
				...(state ? { state } : {}),
			},
		}),

	/** SKIP_WORKOS: email + password login */
	localLogin: (email: string, password: string) =>
		api.post<LocalLoginResponse>('/auth/local/login', { email, password }),

	assignRole: (role: 'CONSUMER' | 'SELLER' | 'NGO') =>
		api.post<{ access_token: string; token_type: string }>('/auth/role', { role }),

	me: () => api.get<MeResponse>('/auth/me'),

	signOut: () => api.post('/auth/signout'),

	/** Permanently delete the authenticated user's account (204 No Content). */
	deleteAccount: () => api.delete('/auth/me'),
}

// ── Profile API ───────────────────────────────────────────────

export interface ConsumerProfilePayload {
	phone_number?: string | null
	address_line1?: string | null
	city?: string | null
	state?: string | null
	postal_code?: string | null
	country?: string | null
	dietary_preferences?: string | null
}

export interface SellerProfilePayload {
	// Core identity
	business_name?: string | null
	business_type?: string | null
	license_number?: string | null
	phone_number?: string | null
	// Address
	address_line1?: string | null
	city?: string | null
	state?: string | null
	postal_code?: string | null
	country?: string | null
	description?: string | null
	// Media
	logo_url?: string | null
	cover_image_url?: string | null
	// Geo coordinates
	lat?: number | null
	lng?: number | null
	// Operating hours
	open_time?: string | null
	close_time?: string | null
	/** JSON array string, e.g. '["Sunday","Monday"]' */
	closed_days?: string | null
	// Compliance
	gst_number?: string | null
	fssai_certificate_url?: string | null
	bank_statement_url?: string | null
	// Bank / payout
	bank_account?: string | null
	ifsc?: string | null
}

export interface SellerProfileOut extends SellerProfilePayload {
	id: string
	user_id: string
	is_verified: boolean
	completion_status: string
	created_at: string
	updated_at: string
}

export interface NGOProfilePayload {
	organization_name?: string | null
	registration_number?: string | null
	mission_statement?: string | null
	phone_number?: string | null
	address_line1?: string | null
	city?: string | null
	state?: string | null
	postal_code?: string | null
	country?: string | null
	serving_capacity?: number | null
}

export const profileApi = {
	getConsumerProfile: () => api.get<ConsumerProfilePayload & { id: string; completion_status: string }>('/profiles/consumer/me'),
	updateConsumerProfile: (data: ConsumerProfilePayload) => api.patch('/profiles/consumer/me', data),

	getSellerProfile: () => api.get<SellerProfileOut>('/profiles/seller/me'),
	updateSellerProfile: (data: SellerProfilePayload) => api.patch<SellerProfileOut>('/profiles/seller/me', data),

	getNGOProfile: () => api.get<NGOProfilePayload & { id: string; completion_status: string }>('/profiles/ngo/me'),
	updateNGOProfile: (data: NGOProfilePayload) => api.patch('/profiles/ngo/me', data),
}

// ── Listings API ──────────────────────────────────────────────

export interface ListingSellerOut {
	id: string
	name: string
	logo: string | null
	category: string | null
	distance: number | null
	rating: number | null
	address: string | null
}

export interface FoodListingOut {
	id: string
	title: string
	description: string | null
	category: string
	images: string[]
	original_price: number
	discounted_price: number
	discount_percent: number
	quantity_available: number
	quantity_unit: string
	dietary_tags: string[]
	allergens: string[]
	pickup_start: string | null
	pickup_end: string | null
	expires_at: string | null
	co2_saved_per_unit: number | null
	is_active: boolean
	rating: number | null
	review_count: number
	seller: ListingSellerOut
	is_favorited: boolean
}

export interface ListingFilters {
	category?: string
	dietary_tags?: string
	max_price?: number
	min_discount?: number
	query?: string
	sort_by?: string
	lat?: number
	lng?: number
	radius_km?: number
	limit?: number
	offset?: number
}

export interface FoodListingCreate {
	title: string
	description?: string | null
	category: string
	images?: string[]
	original_price: number
	discounted_price: number
	discount_percent?: number
	quantity_available?: number
	quantity_unit?: string
	dietary_tags?: string[]
	allergens?: string[]
	pickup_start?: string | null
	pickup_end?: string | null
	expires_at?: string | null
	co2_saved_per_unit?: number | null
	seller_name?: string | null
	seller_address?: string | null
	seller_logo_url?: string | null
	seller_distance_km?: number | null
	seller_rating?: number | null
	seller_category?: string | null
}

export const listingsApi = {
	browse: (params?: ListingFilters) =>
		api.get<FoodListingOut[]>('/listings', { params }),

	getById: (id: string) =>
		api.get<FoodListingOut>(`/listings/${id}`),

	create: (data: FoodListingCreate) =>
		api.post<FoodListingOut>('/listings', data),
}

// ── NGO API ───────────────────────────────────────────────────

export interface NGOProfileOut {
	id: string
	organization_name: string | null
	registration_number: string | null
	mission_statement: string | null
	phone: string | null
	email: string
	address: string | null
	city: string | null
	state: string | null
	postal_code: string | null
	country: string
	serving_capacity: number | null
	logo_url: string | null
	is_verified: boolean
	completion_status: string
	latitude: number | null
	longitude: number | null
	operating_radius_km: number | null
	ngo_type: string | null
	verification_status: string
	document_url: string | null
	contact_person_name: string | null
	vehicle_type: string | null
	open_time: string | null
	close_time: string | null
	closed_days: string[] | null
}

export interface DonationListingOut {
	id: string
	title: string
	description: string | null
	category: string
	food_type: string
	donor_role: string  // "seller" | "consumer"
	quantity_available: number
	quantity_unit: string
	original_price: number
	discounted_price: number
	pickup_start: string | null
	pickup_end: string | null
	expires_at: string | null
	seller_id: string
	seller_name: string | null
	seller_address: string | null
	seller_logo_url: string | null
	is_active: boolean
	distance_from_ngo: number | null
	images: string[] | null
	tags: string[] | null
	created_at: string
}

export interface DonationRequestOut {
	id: string
	ngo_id: string
	listing_id: string
	seller_id: string
	requested_quantity: number
	pickup_time: string | null
	approval_status: string
	created_at: string
	updated_at: string
	listing_title: string | null
	listing_quantity_unit: string | null
	listing_category: string | null
	seller_name: string | null
	// Auto-created pickup info (returned immediately after claim)
	pickup_id: string | null
	pickup_code: string | null
}

export interface NGOPickupOut {
	id: string
	donation_request_id: string | null
	seller_id: string
	pickup_code: string
	pickup_status: string
	pickup_time: string | null
	verification_method: string
	created_at: string
	// Enriched listing / donor details
	listing_id: string | null
	listing_title: string | null
	listing_description: string | null
	listing_category: string | null
	listing_images: string[] | null
	listing_quantity: number | null
	listing_quantity_unit: string | null
	listing_expires_at: string | null
	listing_pickup_start: string | null
	listing_pickup_end: string | null
	seller_name: string | null
	seller_address: string | null
	seller_lat: number | null
	seller_lng: number | null
}

export interface NGODashboardOut {
	total_food_collected_kg: number
	total_food_distributed_kg: number
	total_pickups_completed: number
	total_sellers_supported: number
	total_beneficiaries_served: number
	co2_reduction_total: number
	landfill_waste_reduction_total: number
	total_requests: number
	approved_requests: number
	pending_requests: number
}

export interface NGONotificationOut {
	id: string
	ngo_id: string
	event_type: string
	title: string
	message: string
	reference_id: string | null
	is_read: boolean
	created_at: string
}

export const ngoApi = {
	// Profile
	getProfile: () => api.get<NGOProfileOut>('/ngo-backend/profile'),
	updateProfile: (data: Partial<NGOProfileOut>) => api.patch<NGOProfileOut>('/ngo-backend/profile', data),

	// Discovery
	browseDonations: (params?: {
		city?: string
		food_type?: string
		category?: string
		query?: string
		min_quantity?: number
		max_distance_km?: number
		limit?: number
		offset?: number
	}) => api.get<{ success: boolean; data: DonationListingOut[]; pagination: { total: number; limit: number; offset: number } }>('/ngo-backend/discovery/donations', { params }),

	// Donation requests
	createDonationRequest: (data: { listing_id: string; requested_quantity: number; pickup_time?: string }) =>
		api.post<DonationRequestOut>('/ngo-backend/donations/request', data),
	listDonationRequests: (params?: { approval_status?: string; limit?: number; offset?: number }) =>
		api.get<{ success: boolean; data: DonationRequestOut[]; pagination: { total: number; limit: number; offset: number } }>('/ngo-backend/donations/requests', { params }),
	cancelDonationRequest: (requestId: string) =>
		api.patch(`/ngo-backend/donations/requests/${requestId}/cancel`),

	// Pickups
	listPickups: (params?: { pickup_status?: string; limit?: number; offset?: number }) =>
		api.get<{ success: boolean; data: NGOPickupOut[]; pagination: { total: number; limit: number; offset: number } }>('/ngo-backend/pickups', { params }),
	completePickup: (pickupId: string) =>
		api.post(`/ngo-backend/pickups/${pickupId}/complete`),

	// Analytics
	getDashboard: (range?: 'today' | 'weekly' | 'monthly' | 'yearly') =>
		api.get<{ success: boolean; data: NGODashboardOut }>('/ngo-backend/analytics/dashboard', { params: { range: range ?? 'weekly' } }),

	// Notifications
	listNotifications: (params?: { unread_only?: boolean; limit?: number; offset?: number }) =>
		api.get<{ success: boolean; data: NGONotificationOut[]; pagination: { total: number; limit: number; offset: number } }>('/ngo-backend/notifications', { params }),
	markNotificationRead: (notificationId: string) =>
		api.post(`/ngo-backend/notifications/${notificationId}/read`),
	markAllNotificationsRead: () =>
		api.post('/ngo-backend/notifications/mark-all-read'),
}

// ── Orders API ────────────────────────────────────────────────

export interface OrderItemOut {
	id: string
	food_listing_id: string | null
	listing_title: string
	listing_image: string | null
	listing_unit: string
	listing_pickup_start: string | null
	quantity: number
	unit_price: number
	subtotal: number
	co2_saved: number
}

export interface OrderOut {
	id: string
	order_number: string
	status: string
	total_amount: number
	total_savings: number
	total_co2_saved: number
	platform_fee: number
	payment_method: string
	pickup_time: string | null
	pickup_address: string | null
	cancel_reason: string | null
	qr_code: string | null
	placed_at: string
	updated_at: string
	seller: ListingSellerOut
	items: OrderItemOut[]
}

export interface PlaceOrderItemIn {
	food_listing_id: string
	quantity: number
}

export interface PlaceOrderIn {
	items: PlaceOrderItemIn[]
	payment_method?: string
}

export const ordersApi = {
	place: (data: PlaceOrderIn) =>
		api.post<OrderOut>('/orders', data),

	list: (params?: { status?: string; limit?: number; offset?: number }) =>
		api.get<OrderOut[]>('/orders', { params }),

	getById: (id: string) =>
		api.get<OrderOut>(`/orders/${id}`),

	cancel: (id: string) =>
		api.post<OrderOut>(`/orders/${id}/cancel`),
}

// ── Favorites API ─────────────────────────────────────────────

export interface FavoriteOut {
	id: string
	favorite_type: 'food' | 'seller'
	food_listing: FoodListingOut | null
	seller_id: string | null
	seller_name: string | null
	seller_logo: string | null
}

export interface AddFavoriteIn {
	favorite_type: 'food' | 'seller'
	food_listing_id?: string
	seller_id?: string
}

export const favoritesApi = {
	list: () =>
		api.get<FavoriteOut[]>('/favorites'),

	add: (data: AddFavoriteIn) =>
		api.post<FavoriteOut>('/favorites', data),

	remove: (favoriteId: string) =>
		api.delete(`/favorites/${favoriteId}`),

	removeFoodByListingId: (listingId: string) =>
		api.delete(`/favorites/food/${listingId}`),
}

// ── Impact API ────────────────────────────────────────────────

export interface MonthlyImpactOut {
	month: string
	co2_saved: number
	money_saved: number
	orders_count: number
	food_weight_saved: number
}

export interface ImpactStatsOut {
	total_orders: number
	total_co2_saved: number
	total_money_saved: number
	total_meals_rescued: number
	total_food_weight_saved: number
	streak: number
	level: 'seedling' | 'sprout' | 'sapling' | 'tree' | 'forest'
	next_level_progress: number
	monthly_data: MonthlyImpactOut[]
}

export const impactApi = {
	getMyImpact: () =>
		api.get<ImpactStatsOut>('/impact/me'),
}

// ── Seller Module API ─────────────────────────────────────────

export interface SellerListingOut {
	id: string
	name: string
	description: string
	images: string[]
	category: string
	dietary_tags: string[]
	allergens: string[]
	original_price: number
	discounted_price: number
	discount_percent: number
	total_quantity: number
	quantity_available: number
	quantity_sold: number
	unit: string
	pickup_start: string | null
	pickup_end: string | null
	expires_at: string | null
	status: string
	moderation_status: string | null
	co2_saved_per_unit: number
	views: number
	add_to_cart_count: number
	conversion_rate: number
	expiry_rate: number
	created_at: string
	updated_at: string
}

export interface SellerOrderOut {
	id: string
	order_number: string
	status: string
	customer: {
		id: string | null
		name: string
		avatar: string | null
		phone: string | null
		total_orders_with_seller: number
	}
	items: Array<{
		listing_id: string | null
		listing_name: string
		quantity: number
		unit_price: number
		subtotal: number
		image: string | null
	}>
	total_amount: number
	total_items: number
	pickup_time: string | null
	pickup_window_end: string | null
	qr_code: string | null
	placed_at: string
	updated_at: string
	cancel_reason: string | null
}

export interface SellerNotificationOut {
	id: string
	type: string
	title: string
	message: string
	is_read: boolean
	created_at: string
	action_url: string | null
	metadata: {
		order_id?: string | null
		listing_id?: string | null
	}
}

export interface SellerAnalyticsOut {
	total_revenue: number
	total_orders: number
	avg_order_value: number
	total_customers: number
	revenue_change: number
	orders_change: number
	customers_change: number
	total_food_saved_kg: number
	total_co2_prevented_kg: number
	total_meals_served: number
	daily_revenue: Array<{ day: string; revenue: number; orders: number }>
	weekly_revenue: Array<{ week: string; revenue: number; orders: number }>
	order_breakdown: {
		pending: number
		confirmed: number
		preparing: number
		ready: number
		completed: number
		cancelled: number
	}
	top_listings: Array<{
		listing_id: string
		name: string
		image: string | null
		units_sold: number
		revenue: number
		rating: number
	}>
	category_split: Array<{ category: string; percent: number; revenue: number }>
	rating: number
	review_count: number
	listing_count: number
}

export interface SellerReviewOut {
	id: string
	order_id: string | null
	customer_id: string | null
	customer_name: string
	customer_avatar: string | null
	listing_name: string
	rating: number
	comment: string | null
	created_at: string
	seller_reply: string | null
	seller_replied_at: string | null
}

export interface AiPriceRequest {
	food_name: string
	food_type?: string | null
	base_price: number
	expires_at: string // ISO string
	total_quantity: number
}

export interface AiPricingFactors {
	category: string
	category_source: string
	expiry_discount: number
	inventory_discount: number
	urgency_discount: number
	distance_discount: number
	demand_adjustment: number
	weather_adjustment: number
	time_of_day_adjustment: number
	ngo_priority: boolean
	ngo_action: string | null
	reprice_interval_minutes: number
}

export interface AiPriceResponse {
	discounted_price: number
	discount_percent: number
	remaining_shelf_life_hours: number
	pricing_factors: AiPricingFactors
}

export const sellerApi = {
	listListings: () => api.get<SellerListingOut[]>('/seller/listings'),
	createListing: (data: Record<string, unknown>) => api.post<SellerListingOut>('/seller/listings', data),
	updateListing: (listingId: string, data: Record<string, unknown>) => api.patch<SellerListingOut>(`/seller/listings/${listingId}`, data),
	deleteListing: (listingId: string) => api.delete(`/seller/listings/${listingId}`),

	listOrders: (params?: { status?: string; limit?: number; offset?: number }) => api.get<SellerOrderOut[]>('/seller/orders', { params }),
	getOrderById: (orderId: string) => api.get<SellerOrderOut>(`/seller/orders/${orderId}`),
	updateOrderStatus: (orderId: string, data: { status: string; cancel_reason?: string }) =>
		api.patch<SellerOrderOut>(`/seller/orders/${orderId}/status`, data),

	getAnalytics: () => api.get<SellerAnalyticsOut>('/seller/analytics'),

	listNotifications: (params?: { unread_only?: boolean; event_type?: string; limit?: number; offset?: number }) =>
		api.get<{ notifications: SellerNotificationOut[]; unread_count: number }>('/seller/notifications', { params }),
	markNotificationRead: (notificationId: string) =>
		api.post<{ notification: SellerNotificationOut; unread_count: number }>(`/seller/notifications/${notificationId}/read`),
	markAllNotificationsRead: () =>
		api.post<{ updated_count: number; unread_count: number }>('/seller/notifications/mark-all-read'),

	listReviews: (params?: { rating?: number; limit?: number; offset?: number }) =>
		api.get<{ rating: number; review_count: number; reviews: SellerReviewOut[] }>('/seller/reviews', { params }),
	replyReview: (reviewId: string, message: string) =>
		api.post<{ id: string; seller_reply: string; seller_replied_at: string }>(`/seller/reviews/${reviewId}/reply`, { message }),

	requestInspection: (listingId: string) =>
		api.post<{ listing_id: string; moderation_status: string; message: string }>(`/seller/listings/${listingId}/request-inspection`),
	getInspectionStatus: (listingId: string) =>
		api.get<{ listing_id: string; moderation_status: string | null; seller_status: string }>(`/seller/listings/${listingId}/inspection-status`),

	calculateAiPrice: (data: AiPriceRequest) =>
		api.post<{ success: boolean; data: AiPriceResponse }>('/seller/ai-price', data),
}

// ── Auth me update ────────────────────────────────────────────

export const userApi = {
	updateMe: (data: { first_name?: string | null; last_name?: string | null }) =>
		api.patch<MeResponse>('/auth/me', data),
}

// ── Consumer Surplus Donations API ────────────────────────────

export interface SurplusDonationCreateIn {
	title: string
	description?: string | null
	category: string
	food_type?: string
	dietary_tags?: string[]
	quantity_kg: number
	servings?: number | null
	cooked_at?: string | null
	pickup_start?: string | null
	pickup_end?: string | null
	expires_at?: string | null
	pickup_address: string
	storage_type?: string | null
	packaging_condition?: string | null
	images?: string[]
}

export interface SurplusDonationOut {
	id: string
	title: string
	description: string | null
	category: string
	food_type: string
	donor_role: string
	quantity_available: number
	quantity_unit: string
	pickup_start: string | null
	pickup_end: string | null
	expires_at: string | null
	seller_address: string | null
	is_active: boolean
	is_donation: boolean
	created_at: string
	images: string[] | null
}

export const consumerApi = {
	createSurplusDonation: (data: SurplusDonationCreateIn) =>
		api.post<{ success: boolean; data: SurplusDonationOut; message: string }>('/consumer/surplus-donations', data),

	getMyDonations: (params?: { limit?: number; offset?: number }) =>
		api.get<{ success: boolean; data: SurplusDonationOut[]; pagination: { total: number; limit: number; offset: number } }>('/consumer/surplus-donations', { params }),

	getDonationById: (listingId: string) =>
		api.get<{ success: boolean; data: SurplusDonationOut }>(`/consumer/surplus-donations/${listingId}`),
}

// ── AI Features API ───────────────────────────────────────────────────────────

export interface AIPricingStrategy {
	priority_level: string
	recommended_discount: number
	suggested_price: number
	promotion_strategy: string[]
	ngo_fallback: string
	reasoning: string
	original_price: number
	current_price: number
	hours_remaining: number
	weather: { temperature: number; condition: string }
	price_applied?: boolean
}

export interface AIPricingRequest {
	lat?: number
	lon?: number
	auto_apply?: boolean
}

export interface NGOMatchResult {
	listing_id: string
	title: string
	match_score: number
	urgency: string
	distance_km: number
	expiry_hours: number
	quantity_kg: number
	seller_name: string
	match_reason: string
	pickup_priority: number
}

export interface NGOMatchResponse {
	ngo: { org_name: string; ngo_type: string; city: string }
	matches: NGOMatchResult[]
	pickup_sequence: string[]
	summary: string
	ai_powered: boolean
}

export interface ComplaintTriageRequest {
	complaint_text: string
	complaint_type: 'food_quality' | 'hygiene' | 'misleading_info' | 'other'
	listing_title?: string
	seller_name?: string
	previous_violations?: number
}

export interface ComplaintTriageResult {
	severity_score: number
	urgency: string
	recommended_action: string
	safety_signals: string[]
	triage_summary: string
	auto_suspend: boolean
	ai_powered: boolean
}

export interface SafetyScore {
	listing_id: string
	title: string
	safety_score: number
	risk_level: string
	risk_factors: string[]
	recommendations: string[]
	summary: string
	expiry_hours_remaining: number
	open_complaints: number
	seller_violations: number
	ai_powered: boolean
}

export interface FoodRecommendation {
	listing_id: string
	title: string
	category: string
	match_score: number
	match_reason: string
	price: number
	discount_percent: number
	seller_name: string
	distance_km: number
	tag: string
}

export interface RecommendationsResponse {
	recommendations: FoodRecommendation[]
	sustainability_tip: string
	trending_picks: string[]
	consumer_level: string
	ai_powered: boolean
}

export interface WasteRiskAlert {
	listing_id: string
	title: string
	category: string
	quantity_remaining: number
	expiry_hours: number
	orders_today: number
	current_price: number
}

export interface DemandForecastResponse {
	peak_hours: string[]
	optimal_listing_time: string
	top_demand_categories: string[]
	waste_risk_alerts: WasteRiskAlert[]
	waste_risk_action: string
	restock_recommendations: string[]
	weekly_forecast: string
	summary: string
	total_orders_30d: number
	ai_powered: boolean
}

export const aiApi = {
	/** Seller: generate AI pricing strategy for a food listing */
	getPricingStrategy: (foodId: string, body: AIPricingRequest = {}) =>
		api.post<{ success: boolean; data: AIPricingStrategy }>(`/ai/pricing/${foodId}`, {
			lat: body.lat ?? 19.076,
			lon: body.lon ?? 72.877,
			auto_apply: body.auto_apply ?? false,
		}),

	/** NGO: get AI-matched donation recommendations */
	getNGOMatches: (radiusKm = 50) =>
		api.get<{ success: boolean; data: NGOMatchResponse }>('/ai/ngo-match', {
			params: { radius_km: radiusKm },
		}),

	/** Inspector/Admin: triage a food safety complaint */
	triageComplaint: (body: ComplaintTriageRequest) =>
		api.post<{ success: boolean; data: ComplaintTriageResult }>('/ai/safety/triage', body),

	/** Any authenticated user: get safety score for a listing */
	getSafetyScore: (listingId: string) =>
		api.get<{ success: boolean; data: SafetyScore }>(`/ai/safety/score/${listingId}`),

	/** Consumer: get personalised food recommendations */
	getRecommendations: (params: { lat?: number; lon?: number; limit?: number } = {}) =>
		api.get<{ success: boolean; data: RecommendationsResponse }>('/ai/recommendations', { params }),

	/** Seller: get demand forecast and waste alerts */
	getDemandForecast: () =>
		api.get<{ success: boolean; data: DemandForecastResponse }>('/ai/forecast'),

	/** Any authenticated user: check AI system health */
	getHealth: () =>
		api.get<{ success: boolean; data: { groq_configured: boolean; model: string; agents: string[] } }>('/ai/health'),
}
