import type { FoodItem, FoodCategory, FoodStatus, DietaryTag, Order, OrderStatus, ImpactStats } from '@/types'
import type { FoodListingOut, OrderOut, ImpactStatsOut } from '@/lib/api'

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
