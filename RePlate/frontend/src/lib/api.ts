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
	getAuthorizeUrl: (screenHint?: 'sign-in' | 'sign-up') =>
		api.get<AuthorizeResponse>('/auth/authorize', {
			params: screenHint ? { screen_hint: screenHint } : undefined,
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
	business_name?: string | null
	business_type?: string | null
	phone_number?: string | null
	address_line1?: string | null
	city?: string | null
	state?: string | null
	postal_code?: string | null
	country?: string | null
	description?: string | null
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

	getSellerProfile: () => api.get<SellerProfilePayload & { id: string; completion_status: string }>('/profiles/seller/me'),
	updateSellerProfile: (data: SellerProfilePayload) => api.patch('/profiles/seller/me', data),

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

// ── Auth me update ────────────────────────────────────────────

export const userApi = {
	updateMe: (data: { first_name?: string | null; last_name?: string | null }) =>
		api.patch<MeResponse>('/auth/me', data),
}
