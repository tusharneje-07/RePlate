import type {
	FoodItem,
	FoodCategory,
	FoodStatus,
	DietaryTag,
	Order,
	OrderStatus,
	ImpactStats,
	SellerListing,
	SellerOrder,
	SellerAnalytics,
	SellerNotification,
	SellerReview,
	SellerProfile,
} from '@/types'
import type {
	FoodListingOut,
	OrderOut,
	ImpactStatsOut,
	SellerListingOut,
	SellerOrderOut,
	SellerAnalyticsOut,
	SellerNotificationOut,
	SellerReviewOut,
	MeResponse,
	SellerProfilePayload,
} from '@/lib/api'

// ── FoodListing → FoodItem ─────────────────────────────────────
export function mapListingToFoodItem(listing: FoodListingOut): FoodItem {
	const qty = listing.quantity_available
	let status: FoodStatus = 'available'
	if (qty === 0) status = 'sold-out'
	else if (qty <= 3) status = 'low-stock'

	return {
		id: listing.id,
		name: listing.title,
		description: listing.description ?? '',
		images: listing.images.length > 0 ? listing.images : ['https://placehold.co/400x300?text=No+Image'],
		category: (listing.category as FoodCategory) ?? 'restaurant',
		dietaryTags: (listing.dietary_tags ?? []) as DietaryTag[],
		allergens: listing.allergens ?? [],
		originalPrice: listing.original_price,
		discountedPrice: listing.discounted_price,
		discountPercent: listing.discount_percent,
		quantityAvailable: listing.quantity_available,
		unit: listing.quantity_unit,
		expiresAt: listing.expires_at ?? new Date(Date.now() + 86_400_000).toISOString(),
		pickupStart: listing.pickup_start ?? new Date().toISOString(),
		pickupEnd: listing.pickup_end ?? new Date(Date.now() + 3_600_000).toISOString(),
		status,
		co2SavedKg: listing.co2_saved_per_unit ?? 0,
		rating: listing.rating ?? undefined,
		reviewCount: listing.review_count,
		isFavorited: listing.is_favorited,
		seller: {
			id: listing.seller.id,
			name: listing.seller.name,
			logo: listing.seller.logo ?? undefined,
			category: (listing.seller.category as FoodCategory) ?? 'restaurant',
			distance: listing.seller.distance ?? undefined,
			rating: listing.seller.rating ?? 0,
			address: listing.seller.address ?? '',
		},
	}
}

// ── OrderOut → Order ────────────────────────────────────────────
// The app's Order type uses CartItem[] (with foodItem shape) for items.
// Since OrderOut items don't contain a full FoodItem, we construct minimal
// compatible objects that satisfy what the UI needs.
export function mapOrderOutToOrder(o: OrderOut): Order {
	return {
		id: o.id,
		orderNumber: o.order_number,
		status: o.status as OrderStatus,
		totalAmount: o.total_amount,
		totalSavings: o.total_savings,
		co2Saved: o.total_co2_saved,
		pickupAddress: o.pickup_address ?? o.seller.address ?? '',
		pickupTime: o.pickup_time ?? o.placed_at,
		qrCode: o.qr_code ?? undefined,
		placedAt: o.placed_at,
		updatedAt: o.updated_at,
		cancelReason: o.cancel_reason ?? undefined,
		seller: {
			id: o.seller.id,
			name: o.seller.name,
			logo: o.seller.logo ?? undefined,
			category: (o.seller.category as FoodCategory) ?? 'restaurant',
			distance: o.seller.distance ?? undefined,
			rating: o.seller.rating ?? 0,
			address: o.seller.address ?? '',
		},
		items: o.items.map((item) => ({
			id: item.id,
			quantity: item.quantity,
			subtotal: item.subtotal,
			pickupTime: o.pickup_time ?? o.placed_at,
			foodItem: {
				id: item.food_listing_id ?? item.id,
				name: item.listing_title,
				description: '',
				images: item.listing_image ? [item.listing_image] : ['https://placehold.co/400x300?text=No+Image'],
				category: 'restaurant' as FoodCategory,
				dietaryTags: [],
				allergens: [],
				originalPrice: item.unit_price,
				discountedPrice: item.unit_price,
				discountPercent: 0,
				quantityAvailable: 0,
				unit: item.listing_unit,
				expiresAt: o.placed_at,
				pickupStart: o.pickup_time ?? o.placed_at,
				pickupEnd: o.pickup_time ?? o.placed_at,
				status: 'available' as FoodStatus,
				co2SavedKg: item.co2_saved,
				seller: {
					id: o.seller.id,
					name: o.seller.name,
					logo: o.seller.logo ?? undefined,
					category: (o.seller.category as FoodCategory) ?? 'restaurant',
					distance: o.seller.distance ?? undefined,
					rating: o.seller.rating ?? 0,
					address: o.seller.address ?? '',
				},
			},
		})),
	}
}

// ── ImpactStatsOut → ImpactStats ────────────────────────────────
export function mapImpactStatsOut(s: ImpactStatsOut): ImpactStats {
	return {
		totalOrders: s.total_orders,
		totalCo2Saved: s.total_co2_saved,
		totalMoneySaved: s.total_money_saved,
		totalMealsRescued: s.total_meals_rescued,
		totalFoodWeightSaved: s.total_food_weight_saved,
		streak: s.streak,
		level: s.level,
		nextLevelProgress: s.next_level_progress,
		monthlyData: s.monthly_data.map((m) => ({
			month: m.month,
			co2Saved: m.co2_saved,
			moneySaved: m.money_saved,
			ordersCount: m.orders_count,
			foodWeightSaved: m.food_weight_saved,
		})),
	}
}

export function mapSellerListingOutToSellerListing(s: SellerListingOut): SellerListing {
	return {
		id: s.id,
		name: s.name,
		description: s.description,
		images: s.images,
		category: (s.category as FoodCategory) ?? 'bakery',
		dietaryTags: (s.dietary_tags as DietaryTag[]) ?? [],
		allergens: s.allergens ?? [],
		originalPrice: s.original_price,
		discountedPrice: s.discounted_price,
		discountPercent: s.discount_percent,
		totalQuantity: s.total_quantity,
		quantityAvailable: s.quantity_available,
		quantitySold: s.quantity_sold,
		unit: s.unit,
		prepTimeMinutes: 0,
		pickupStart: s.pickup_start ?? new Date().toISOString(),
		pickupEnd: s.pickup_end ?? new Date(Date.now() + 3600000).toISOString(),
		expiresAt: s.expires_at ?? new Date(Date.now() + 7200000).toISOString(),
		status: (s.status as SellerListing['status']) ?? 'active',
		co2SavedPerUnit: s.co2_saved_per_unit,
		views: s.views,
		addToCartCount: s.add_to_cart_count,
		conversionRate: s.conversion_rate,
		expiryRate: s.expiry_rate,
		createdAt: s.created_at,
		updatedAt: s.updated_at,
	}
}

export function mapSellerOrderOutToSellerOrder(o: SellerOrderOut): SellerOrder {
	return {
		id: o.id,
		orderNumber: o.order_number,
		status: o.status as SellerOrder['status'],
		customer: {
			id: o.customer.id ?? 'unknown',
			name: o.customer.name,
			avatar: o.customer.avatar ?? undefined,
			phone: o.customer.phone ?? undefined,
			totalOrdersWithSeller: o.customer.total_orders_with_seller,
		},
		items: o.items.map((item) => ({
			listingId: item.listing_id ?? 'unknown',
			listingName: item.listing_name,
			quantity: item.quantity,
			unitPrice: item.unit_price,
			subtotal: item.subtotal,
			image: item.image ?? undefined,
		})),
		totalAmount: o.total_amount,
		totalItems: o.total_items,
		pickupTime: o.pickup_time ?? o.placed_at,
		pickupWindowEnd: o.pickup_window_end ?? o.pickup_time ?? o.placed_at,
		qrCode: o.qr_code ?? '',
		placedAt: o.placed_at,
		updatedAt: o.updated_at,
		cancelReason: o.cancel_reason ?? undefined,
	}
}

export function mapSellerAnalyticsOutToSellerAnalytics(a: SellerAnalyticsOut): SellerAnalytics {
	return {
		totalRevenue: a.total_revenue,
		totalOrders: a.total_orders,
		avgOrderValue: a.avg_order_value,
		totalCustomers: a.total_customers,
		revenueChange: a.revenue_change,
		ordersChange: a.orders_change,
		customersChange: a.customers_change,
		totalFoodSavedKg: a.total_food_saved_kg,
		totalCo2PreventedKg: a.total_co2_prevented_kg,
		totalMealsServed: a.total_meals_served,
		dailyRevenue: a.daily_revenue,
		weeklyRevenue: a.weekly_revenue,
		orderBreakdown: a.order_breakdown,
		topListings: a.top_listings.map((item) => ({
			listingId: item.listing_id,
			name: item.name,
			image: item.image ?? undefined,
			unitsSold: item.units_sold,
			revenue: item.revenue,
			rating: item.rating,
		})),
		categorySplit: a.category_split,
	}
}

export function mapSellerNotificationOutToSellerNotification(n: SellerNotificationOut): SellerNotification {
	return {
		id: n.id,
		type: n.type as SellerNotification['type'],
		title: n.title,
		message: n.message,
		isRead: n.is_read,
		createdAt: n.created_at,
		actionUrl: n.action_url ?? undefined,
		metadata: {
			orderId: n.metadata?.order_id ?? undefined,
			listingId: n.metadata?.listing_id ?? undefined,
		},
	}
}

export function mapSellerReviewOutToSellerReview(r: SellerReviewOut): SellerReview {
	return {
		id: r.id,
		orderId: r.order_id ?? 'unknown',
		customerId: r.customer_id ?? 'unknown',
		customerName: r.customer_name,
		customerAvatar: r.customer_avatar ?? undefined,
		listingName: r.listing_name,
		rating: r.rating,
		comment: r.comment ?? undefined,
		createdAt: r.created_at,
		sellerReply: r.seller_reply ?? undefined,
		sellerRepliedAt: r.seller_replied_at ?? undefined,
	}
}

export function mapSellerProfile(me: MeResponse, profile: SellerProfilePayload, analytics?: SellerAnalytics): SellerProfile {
	const fallbackName = [me.first_name, me.last_name].filter(Boolean).join(' ') || me.email.split('@')[0]
	const displayName = profile.business_name ?? fallbackName
	const ownerName = fallbackName
	return {
		id: me.id,
		name: displayName,
		ownerName,
		email: me.email,
		phone: profile.phone_number ?? 'Not added',
		logo: undefined,
		coverImage: undefined,
		description: profile.description ?? 'No description added yet.',
		category: (profile.business_type as SellerProfile['category']) ?? 'bakery',
		address: profile.address_line1 ?? 'Address not added',
		city: profile.city ?? 'City',
		pincode: profile.postal_code ?? '000000',
		location: { lat: 0, lng: 0 },
		openTime: '08:00',
		closeTime: '21:00',
		closedDays: [],
		verificationStatus: 'verified',
		isOpen: true,
		fssaiLicense: undefined,
		gstNumber: undefined,
		bankAccountLinked: false,
		rating: analytics?.topListings[0]?.rating ?? 0,
		reviewCount: analytics?.topListings.length ?? 0,
		totalOrdersCompleted: analytics?.orderBreakdown.completed ?? 0,
		memberSince: me.created_at,
		totalFoodSavedKg: analytics?.totalFoodSavedKg ?? 0,
		totalCo2PreventedKg: analytics?.totalCo2PreventedKg ?? 0,
		totalMealsServed: analytics?.totalMealsServed ?? 0,
	}
}
