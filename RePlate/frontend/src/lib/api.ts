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

// ── Response interceptor — handle 401 ────────────────────────
api.interceptors.response.use(
	(response) => response,
	(error: AxiosError) => {
		if (error.response?.status === 401) {
			localStorage.removeItem(TOKEN_KEY)
			// Redirect to login only if not already there
			if (!window.location.pathname.startsWith('/auth')) {
				window.location.href = '/auth/login'
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

export const authApi = {
	getAuthorizeUrl: (screenHint?: 'sign-in' | 'sign-up', state?: string) =>
		api.get<AuthorizeResponse>('/auth/authorize', {
			params: {
				...(screenHint ? { screen_hint: screenHint } : {}),
				...(state ? { state } : {}),
			},
		}),

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

export const listingsApi = {
	browse: (params?: ListingFilters) =>
		api.get<FoodListingOut[]>('/listings', { params }),

	getById: (id: string) =>
		api.get<FoodListingOut>(`/listings/${id}`),
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
}

// ── Auth me update ────────────────────────────────────────────

export const userApi = {
	updateMe: (data: { first_name?: string | null; last_name?: string | null }) =>
		api.patch<MeResponse>('/auth/me', data),
}
