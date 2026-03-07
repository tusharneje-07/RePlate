// ── API Types ──────────────────────────────────────────────
export interface ApiError {
	message: string
	code: string
	status: number
	details?: Record<string, unknown>
}

export interface ApiResponse<T> {
	data: T
	meta?: {
		page?: number
		total?: number
		totalPages?: number
		hasNext?: boolean
	}
}

// ── User / Auth ────────────────────────────────────────────
export interface User {
	id: string
	name: string
	email: string
	avatar?: string
	phone?: string
	location?: UserLocation
	preferences?: UserPreferences
	createdAt: string
}

export interface UserLocation {
	lat: number
	lng: number
	address: string
	city: string
	pincode: string
}

export interface UserPreferences {
	dietary: DietaryTag[]
	allergens: string[]
	preferredCategories: FoodCategory[]
	notificationsEnabled: boolean
	radius: number
}

// ── Food ───────────────────────────────────────────────────
export type FoodCategory =
	| 'bakery'
	| 'restaurant'
	| 'grocery'
	| 'cafe'
	| 'sweets'
	| 'fruits'
	| 'vegetables'
	| 'dairy'
	| 'beverages'
	| 'snacks'
	| 'meals'
	| 'desserts'

export type DietaryTag = 'veg' | 'vegan' | 'non-veg' | 'gluten-free' | 'dairy-free' | 'jain'

export type FoodStatus = 'available' | 'low-stock' | 'sold-out' | 'upcoming'

export interface FoodItem {
	id: string
	name: string
	description: string
	images: string[]
	category: FoodCategory
	dietaryTags: DietaryTag[]
	allergens: string[]
	originalPrice: number
	discountedPrice: number
	discountPercent: number
	quantityAvailable: number
	unit: string
	weight?: number
	manufacturedAt?: string
	expiresAt: string
	pickupStart: string | null
	pickupEnd: string | null
	status: FoodStatus
	co2SavedKg: number
	seller: SellerSummary
	rating?: number
	reviewCount?: number
	isFavorited?: boolean
}

export interface SellerSummary {
	id: string
	name: string
	logo?: string
	category: FoodCategory
	distance?: number
	rating: number
	address: string
}

// ── Seller ─────────────────────────────────────────────────
export interface Seller {
	id: string
	name: string
	logo?: string
	coverImage?: string
	description: string
	category: FoodCategory
	address: string
	location: { lat: number; lng: number }
	distance?: number
	rating: number
	reviewCount: number
	phone: string
	openTime: string
	closeTime: string
	isOpen: boolean
	totalFoodSaved: number
	activeListing: number
	isFavorited?: boolean
}

// ── Cart ───────────────────────────────────────────────────
export interface CartItem {
	id: string
	foodItem: FoodItem
	quantity: number
	subtotal: number
	pickupTime: string | null
}

export interface Cart {
	items: CartItem[]
	totalItems: number
	totalAmount: number
	totalCo2Saved: number
	totalSavings: number
	groupedBySeller: SellerCartGroup[]
}

export interface SellerCartGroup {
	seller: SellerSummary
	items: CartItem[]
	subtotal: number
	pickupTime?: string
}

// ── Order ──────────────────────────────────────────────────
export type OrderStatus =
	| 'pending'
	| 'confirmed'
	| 'preparing'
	| 'ready_for_pickup'
	| 'completed'
	| 'cancelled'

export interface Order {
	id: string
	orderNumber: string
	status: OrderStatus
	items: CartItem[]
	seller: SellerSummary
	totalAmount: number
	totalSavings: number
	co2Saved: number
	pickupAddress: string
	pickupTime: string
	qrCode?: string
	placedAt: string
	updatedAt: string
	cancelReason?: string
}

// ── Impact ─────────────────────────────────────────────────
export interface ImpactStats {
	totalOrders: number
	totalMoneySaved: number
	totalCo2Saved: number
	totalFoodWeightSaved: number
	totalMealsRescued: number
	streak: number
	level: ImpactLevel
	nextLevelProgress: number
	monthlyData: MonthlyImpact[]
}

export type ImpactLevel = 'seedling' | 'sprout' | 'sapling' | 'tree' | 'forest'

export interface MonthlyImpact {
	month: string
	co2Saved: number
	moneySaved: number
	ordersCount: number
	foodWeightSaved: number
}

// ── Notifications ──────────────────────────────────────────
export type NotificationType = 'deal' | 'order' | 'system' | 'impact'

export interface Notification {
	id: string
	type: NotificationType
	title: string
	message: string
	isRead: boolean
	createdAt: string
	actionUrl?: string
	imageUrl?: string
}

// ── Weather ────────────────────────────────────────────────
export interface WeatherData {
	temperature: number
	condition: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'foggy'
	description: string
	humidity: number
	precipitationProbability: number
	isRainWarning: boolean
}

// ── Consumer Surplus Listing ───────────────────────────────
export type SurplusListingStatus =
	| 'listed'
	| 'claimed'
	| 'pickup_scheduled'
	| 'picked_up'
	| 'completed'
	| 'expired'

export type StorageType = 'room_temp' | 'refrigerated' | 'frozen'

export type PackagingCondition = 'sealed' | 'covered' | 'open' | 'containers'

export interface SurplusListing {
	id: string
	foodName: string
	eventType: string
	category: FoodCategory
	dietaryTag: DietaryTag
	quantityKg: number
	servings: number
	cookedAt: string
	expiresAt: string
	pickupStart: string
	pickupEnd: string
	pickupLocation: string
	storageType: StorageType
	packagingCondition: PackagingCondition
	images: string[]
	notes: string
	hygieneConfirmed: boolean
	status: SurplusListingStatus
	listedAt: string
	claimedBy?: string
	co2SavedKg?: number
	mealsServed?: number
	foodSavedKg?: number
}

// ── Seller Module Types ─────────────────────────────────────

export type SellerCategory =
	| 'bakery'
	| 'restaurant'
	| 'cafe'
	| 'grocery'
	| 'sweets'
	| 'cloud_kitchen'
	| 'catering'

export type SellerVerificationStatus =
	| 'pending'
	| 'under_review'
	| 'verified'
	| 'rejected'
	| 'suspended'

export type ListingStatus =
	| 'active'
	| 'paused'
	| 'sold_out'
	| 'expired'
	| 'draft'
	| 'scheduled'

export type SellerOrderStatus =
	| 'pending'
	| 'confirmed'
	| 'preparing'
	| 'ready_for_pickup'
	| 'completed'
	| 'cancelled'

export type NotificationEventType =
	| 'new_order'
	| 'order_cancelled'
	| 'pickup_reminder'
	| 'listing_expiry'
	| 'low_stock'
	| 'new_review'
	| 'payment_received'
	| 'system'

export interface SellerProfile {
	id: string
	name: string
	ownerName: string
	email: string
	phone: string
	logo?: string
	coverImage?: string
	description: string
	category: SellerCategory
	address: string
	city: string
	pincode: string
	location: { lat: number; lng: number }
	openTime: string
	closeTime: string
	closedDays: string[]
	verificationStatus: SellerVerificationStatus
	isOpen: boolean
	fssaiLicense?: string
	gstNumber?: string
	bankAccountLinked: boolean
	rating: number
	reviewCount: number
	totalOrdersCompleted: number
	memberSince: string
	// Sustainability
	totalFoodSavedKg: number
	totalCo2PreventedKg: number
	totalMealsServed: number
}

export interface SellerListing {
	id: string
	name: string
	description: string
	images: string[]
	category: FoodCategory
	dietaryTags: DietaryTag[]
	allergens: string[]
	originalPrice: number
	discountedPrice: number
	discountPercent: number
	totalQuantity: number
	quantityAvailable: number
	quantitySold: number
	unit: string
	weight?: number
	prepTimeMinutes?: number
	pickupStart: string
	pickupEnd: string
	expiresAt: string
	status: ListingStatus
	moderationStatus: 'pending_inspection' | 'approved' | 'rejected' | null
	co2SavedPerUnit: number
	// Performance
	views: number
	addToCartCount: number
	conversionRate: number
	expiryRate: number
	// AI
	aiSuggestedPrice?: number
	aiSuggestedDiscount?: number
	aiPriceReason?: string
	createdAt: string
	updatedAt: string
}

export interface SellerOrder {
	id: string
	orderNumber: string
	status: SellerOrderStatus
	customer: {
		id: string
		name: string
		avatar?: string
		phone?: string
		totalOrdersWithSeller: number
	}
	items: Array<{
		listingId: string
		listingName: string
		quantity: number
		unitPrice: number
		subtotal: number
		image?: string
	}>
	totalAmount: number
	totalItems: number
	pickupTime: string
	pickupWindowEnd: string
	qrCode: string
	placedAt: string
	updatedAt: string
	confirmedAt?: string
	completedAt?: string
	cancelReason?: string
	customerNote?: string
}

export interface SellerAnalytics {
	// Overview
	totalRevenue: number
	totalOrders: number
	avgOrderValue: number
	totalCustomers: number
	// Week/Day comparison
	revenueChange: number
	ordersChange: number
	customersChange: number
	// Sustainability
	totalFoodSavedKg: number
	totalCo2PreventedKg: number
	totalMealsServed: number
	// Charts
	dailyRevenue: Array<{ day: string; revenue: number; orders: number }>
	weeklyRevenue: Array<{ week: string; revenue: number; orders: number }>
	// Order states breakdown
	orderBreakdown: {
		pending: number
		confirmed: number
		preparing: number
		ready: number
		completed: number
		cancelled: number
	}
	// Popular items
	topListings: Array<{
		listingId: string
		name: string
		image?: string
		unitsSold: number
		revenue: number
		rating: number
	}>
	// Category split
	categorySplit: Array<{ category: string; percent: number; revenue: number }>
}

export interface SellerNotification {
	id: string
	type: NotificationEventType
	title: string
	message: string
	isRead: boolean
	createdAt: string
	actionUrl?: string
	metadata?: {
		orderId?: string
		listingId?: string
		customerName?: string
		amount?: number
	}
}

export interface SellerReview {
	id: string
	orderId: string
	customerId: string
	customerName: string
	customerAvatar?: string
	listingName: string
	rating: number
	comment?: string
	createdAt: string
	sellerReply?: string
	sellerRepliedAt?: string
}

export interface AIPricingSuggestion {
	listingId: string
	currentPrice: number
	suggestedPrice: number
	suggestedDiscount: number
	confidence: number
	reasoning: string
	demandLevel: 'very_low' | 'low' | 'medium' | 'high' | 'very_high'
	expiryUrgency: 'low' | 'medium' | 'high' | 'critical'
	weatherImpact?: string
	generatedAt: string
}

export interface WeatherSuggestion {
	condition: string
	temperature: number
	recommendation: string
	affectedListings: string[]
	icon: string
}

// ── NGO Module Types ───────────────────────────────────────

export type NGOVerificationStatus =
	| 'pending'
	| 'under_review'
	| 'verified'
	| 'rejected'
	| 'suspended'

export type NGOCategory =
	| 'food_bank'
	| 'shelter'
	| 'community_kitchen'
	| 'orphanage'
	| 'old_age_home'
	| 'disaster_relief'
	| 'educational'
	| 'other'

export type DonationStatus =
	| 'available'
	| 'claimed'
	| 'pickup_scheduled'
	| 'picked_up'
	| 'completed'
	| 'expired'
	| 'cancelled'

export type DonationUrgency = 'low' | 'medium' | 'high' | 'critical'

export type PickupPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NGONotificationEventType =
	| 'new_donation'
	| 'donation_expiring'
	| 'pickup_reminder'
	| 'pickup_confirmed'
	| 'donation_cancelled'
	| 'weather_alert'
	| 'ai_suggestion'
	| 'system'

export interface NGOProfile {
	id: string
	organizationName: string
	registrationNumber: string
	category: NGOCategory
	contactPerson: string
	email: string
	phone: string
	logo?: string
	coverImage?: string
	description: string
	address: string
	city: string
	pincode: string
	location: { lat: number; lng: number }
	serviceAreas: string[]
	operatingHours: { open: string; close: string }
	closedDays: string[]
	pickupCapacityKg: number
	vehicleType: 'bicycle' | 'two_wheeler' | 'auto' | 'van' | 'truck'
	verificationStatus: NGOVerificationStatus
	// Compliance
	ngoRegistrationDoc?: string
	fcraRegistration?: string
	panNumber?: string
	// Stats
	totalFoodRescuedKg: number
	totalMealsServed: number
	totalCo2PreventedKg: number
	totalPickupsCompleted: number
	memberSince: string
	rating: number
	reviewCount: number
}

export interface Donation {
	id: string
	donorId: string
	donorName: string
	donorType: 'consumer' | 'seller'
	donorAddress: string
	donorPhone?: string
	donorLocation: { lat: number; lng: number }
	foodName: string
	description: string
	category: FoodCategory
	dietaryTag: DietaryTag
	quantityKg: number
	servings: number
	images: string[]
	cookedAt: string
	expiresAt: string
	pickupStart: string
	pickupEnd: string
	storageType: StorageType
	packagingCondition: PackagingCondition
	storageNotes?: string
	hygieneConfirmed: boolean
	status: DonationStatus
	urgency: DonationUrgency
	distance?: number
	co2SavedKg: number
	listedAt: string
	claimedBy?: string
	claimedAt?: string
	pickupCode?: string
	qrCode?: string
	completedAt?: string
	notes?: string
}

export interface NGOPickup {
	id: string
	donationId: string
	donation: Donation
	ngoId: string
	scheduledAt: string
	estimatedArrival?: string
	actualPickupTime?: string
	status: DonationStatus
	priority: PickupPriority
	verificationCode: string
	qrCode: string
	volunteerName?: string
	volunteerPhone?: string
	notes?: string
	// Redistribution
	redistributionTarget?: string
	mealsServed?: number
	redistributionNotes?: string
	redistributionCompletedAt?: string
}

export interface NGOImpactStats {
	totalFoodRescuedKg: number
	totalMealsServed: number
	totalCo2PreventedKg: number
	totalPickups: number
	activePickups: number
	streak: number
	weeklyData: Array<{
		day: string
		foodKg: number
		meals: number
		pickups: number
	}>
	monthlyData: Array<{
		month: string
		foodKg: number
		meals: number
		co2Kg: number
		pickups: number
	}>
	communityReach: number
	topCategories: Array<{ category: string; percent: number }>
}

export interface NGONotification {
	id: string
	type: NGONotificationEventType
	title: string
	message: string
	isRead: boolean
	createdAt: string
	actionUrl?: string
	metadata?: {
		donationId?: string
		pickupId?: string
		donorName?: string
		quantityKg?: number
		expiresAt?: string
		urgency?: DonationUrgency
	}
}

export interface AIPickupSuggestion {
	type: 'prioritize' | 'cluster' | 'predict'
	title: string
	message: string
	affectedDonationIds: string[]
	confidence: number
	reasoning: string
	generatedAt: string
}

export interface RedistributionRecord {
	id: string
	pickupId: string
	donationId: string
	target: string
	mealsServed: number
	communityNotes: string
	completedAt: string
	images?: string[]
}

// ── Food Inspector Module Types ─────────────────────────────

export type InspectorAuthorityLevel = 'regional_officer' | 'senior_inspector' | 'chief_inspector'

export type InspectorAvailabilityStatus = 'active' | 'on_field' | 'offline'

export type InspectionRiskLevel = 'low' | 'moderate' | 'high' | 'critical'

export type InspectionUrgency = 'normal' | 'expiring_12h' | 'expiring_6h' | 'expired'

export type InspectionListingStatus =
	| 'active'
	| 'under_review'
	| 'approved'
	| 'info_requested'
	| 'temporarily_disabled'
	| 'expired'

export type InspectorComplaintStatus =
	| 'submitted'
	| 'under_review'
	| 'investigating'
	| 'resolved'
	| 'dismissed'

export type InspectorComplaintSeverity = 'low' | 'medium' | 'high' | 'critical'

export type HygieneRating = 'excellent' | 'good' | 'fair' | 'poor' | 'critical'

export type EnforcementActionType =
	| 'warning_notice'
	| 'listing_suspension'
	| 'seller_restriction'
	| 'donation_cancellation'
	| 'account_suspension'

export type InspectorNotificationType =
	| 'high_risk_listing'
	| 'near_expiry_bulk_donation'
	| 'multiple_complaints'
	| 'weather_alert'
	| 'enforcement_update'
	| 'inspection_due'
	| 'system'

export interface FoodInspectorProfile {
	id: string
	name: string
	email: string
	phone: string
	avatar?: string
	certificationId: string
	authorityLevel: InspectorAuthorityLevel
	verificationAuthority: string
	assignedRegions: string[]
	headquarters: string
	availabilityStatus: InspectorAvailabilityStatus
	joinedAt: string
}

export interface ListingSafetyDeclaration {
	preparationTime: string
	expiryTime: string
	storageType: StorageType
	packagingCondition: PackagingCondition
	temperatureRequiredC?: number
	handlingDeclaration: string
	hygieneDeclaration: string
	consumer24HourRuleCompliant: boolean
	declarationSubmittedAt: string
}

export interface InspectorListing {
	id: string
	sourceType: 'seller' | 'consumer'
	sourceId: string
	sourceName: string
	sourceRating?: number
	region: string
	address: string
	foodName: string
	category: FoodCategory
	quantityKg: number
	servings?: number
	preparedAt: string
	expiresAt: string
	pickupStart: string
	pickupEnd: string
	status: InspectionListingStatus
	urgency: InspectionUrgency
	riskLevel: InspectionRiskLevel
	riskFlags: string[]
	safetyDeclaration: ListingSafetyDeclaration
	inspectionNotes?: string
	images?: string[]
	lastActionAt?: string
	lastActionBy?: string
	createdAt: string
	updatedAt: string
}

export interface InspectorComplaint {
	id: string
	listingId?: string
	submittedByType: 'consumer' | 'ngo' | 'seller'
	submittedByName: string
	region: string
	title: string
	description: string
	evidenceUrls: string[]
	severity: InspectorComplaintSeverity
	status: InspectorComplaintStatus
	assignedInspectorId?: string
	investigationNotes?: string
	actionTaken?: EnforcementActionType
	resolutionSummary?: string
	createdAt: string
	updatedAt: string
	resolvedAt?: string
}

export interface InspectionViolation {
	id: string
	type: 'storage' | 'packaging' | 'temperature' | 'expiry' | 'hygiene' | 'documentation'
	severity: InspectionRiskLevel
	description: string
	recommendation: string
	actionRequired: boolean
}

export interface FieldInspectionRecord {
	id: string
	inspectorId: string
	entityType: 'seller' | 'consumer_donor'
	entityId: string
	entityName: string
	region: string
	location: string
	inspectionDate: string
	hygieneRating: HygieneRating
	violations: InspectionViolation[]
	recommendations: string[]
	nextInspectionDue?: string
	trustScoreImpact: number
	attachments?: string[]
	createdAt: string
}

export interface InspectorSafetyAlert {
	id: string
	type: 'near_expiry_large_donation' | 'improper_storage' | 'repeat_complaints' | 'weather_risk' | 'ai_detected_risk'
	title: string
	message: string
	region: string
	riskLevel: InspectionRiskLevel
	relatedListingIds: string[]
	relatedComplaintIds: string[]
	createdAt: string
	isResolved: boolean
}

export interface EnforcementActionLog {
	id: string
	inspectorId: string
	targetType: 'listing' | 'seller_account' | 'donation'
	targetId: string
	action: EnforcementActionType
	reason: string
	notes?: string
	createdAt: string
}

export interface AIRiskDetection {
	id: string
	type: 'suspicious_listing' | 'risky_combination' | 'abnormal_expiry_pattern' | 'inspection_recommendation'
	title: string
	summary: string
	confidence: number
	riskLevel: InspectionRiskLevel
	affectedListingIds: string[]
	recommendedAction: string
	generatedAt: string
}

export interface WeatherRiskAlert {
	id: string
	region: string
	condition: 'heat' | 'rain' | 'flood' | 'storm'
	title: string
	message: string
	riskLevel: InspectionRiskLevel
	recommendedAction: string
	startAt: string
	endAt: string
}

export interface InspectorComplianceStats {
	totalListingsMonitored: number
	flaggedListings: number
	resolvedComplaints: number
	activeInvestigations: number
	verifiedSafeListings: number
	rejectedUnsafeListings: number
	regionalComplianceScore: number
	incidentsPrevented: number
}

export interface InspectorNotification {
	id: string
	type: InspectorNotificationType
	title: string
	message: string
	isRead: boolean
	createdAt: string
	actionUrl?: string
}

// ── Filters ────────────────────────────────────────────────
export interface FoodFilters {
	query?: string
	categories?: FoodCategory[]
	dietaryTags?: DietaryTag[]
	maxDistance?: number
	maxPrice?: number
	minDiscount?: number
	sortBy?: 'distance' | 'price' | 'discount' | 'rating' | 'expiry'
	pickupBefore?: string
}
