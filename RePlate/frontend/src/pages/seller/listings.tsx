import { useState, useCallback, useRef, type ChangeEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	Plus,
	Search,
	Sparkles,
	Eye,
	Pencil,
	Trash2,
	PauseCircle,
	PlayCircle,
	MoreVertical,
	PackageOpen,
	TrendingUp,
	Clock,
	ChevronDown,
	X,
	Check,
	AlertTriangle,
	IndianRupee,
	BarChart2,
	Zap,
	RefreshCw,
	Image as ImageIcon,
	ChevronRight,
	Info,
	Upload,
	Loader2,
	Salad,
	Sprout,
	Drumstick,
	Wheat,
	Milk,
	HandMetal,
	Sun,
	ShieldCheck,
	Bot,
} from 'lucide-react'
import type React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { slideUp, staggerContainer, fadeIn, scaleIn } from '@/lib/motion'
import { formatCurrency, formatRelativeTime, toLocalDatetimeStr, parseDatetimeLocalAsIST } from '@/lib/utils'
import { uploadFile, sellerApi } from '@/lib/api'
import type { AiPriceResponse } from '@/lib/api'
import { useSellerStore } from '@/stores/seller-store'
import { useSellerUIStore } from '@/stores/seller-ui-store'
import type { SellerListing, ListingStatus, DietaryTag, FoodCategory } from '@/types'
import { cn } from '@/lib/utils'

const aiPricingSuggestions: Array<{
	listingId: string
	currentPrice: number
	suggestedPrice: number
	suggestedDiscount?: number
	reasoning: string
	confidence?: number
	demandLevel?: string
	expiryUrgency?: string
	weatherImpact?: string
}> = []

const MAX_IMAGE_UPLOADS = 3

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const STATUS_TABS: { value: ListingStatus | 'all'; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'active', label: 'Active' },
	{ value: 'scheduled', label: 'Scheduled' },
	{ value: 'sold_out', label: 'Sold Out' },
	{ value: 'paused', label: 'Paused' },
	{ value: 'draft', label: 'Draft' },
	{ value: 'expired', label: 'Expired' },
]

const DIETARY_OPTIONS: { value: DietaryTag; label: string; icon: React.ReactNode }[] = [
	{ value: 'veg', label: 'Veg', icon: <Salad size={14} /> },
	{ value: 'vegan', label: 'Vegan', icon: <Sprout size={14} /> },
	{ value: 'non-veg', label: 'Non-Veg', icon: <Drumstick size={14} /> },
	{ value: 'gluten-free', label: 'Gluten-Free', icon: <Wheat size={14} /> },
	{ value: 'dairy-free', label: 'Dairy-Free', icon: <Milk size={14} /> },
	{ value: 'jain', label: 'Jain', icon: <HandMetal size={14} /> },
]

const ALLERGEN_OPTIONS = ['gluten', 'dairy', 'eggs', 'nuts', 'soy', 'fish', 'shellfish', 'sesame']

const CATEGORY_OPTIONS: { value: FoodCategory; label: string }[] = [
	{ value: 'bakery', label: 'Bakery' },
	{ value: 'restaurant', label: 'Restaurant' },
	{ value: 'cafe', label: 'Café' },
	{ value: 'grocery', label: 'Grocery' },
	{ value: 'sweets', label: 'Sweets' },
	{ value: 'snacks', label: 'Snacks' },
	{ value: 'meals', label: 'Meals' },
	{ value: 'desserts', label: 'Desserts' },
	{ value: 'beverages', label: 'Beverages' },
]

const STATUS_CONFIG: Record<
	ListingStatus,
	{ label: string; color: string; bg: string; dot: string }
> = {
	active: {
		label: 'Active',
		color: 'text-[var(--color-success)]',
		bg: 'bg-[var(--color-success-light)]',
		dot: 'bg-[var(--color-success)]',
	},
	paused: {
		label: 'Paused',
		color: 'text-[var(--color-warning)]',
		bg: 'bg-[var(--color-warning-light)]',
		dot: 'bg-[var(--color-warning)]',
	},
	sold_out: {
		label: 'Sold Out',
		color: 'text-[var(--color-seller-text-muted)]',
		bg: 'bg-[var(--color-seller-surface-elevated)]',
		dot: 'bg-[var(--color-seller-text-muted)]',
	},
	expired: {
		label: 'Expired',
		color: 'text-[var(--color-error)]',
		bg: 'bg-[var(--color-error-light)]',
		dot: 'bg-[var(--color-error)]',
	},
	draft: {
		label: 'Draft',
		color: 'text-[var(--color-seller-text-muted)]',
		bg: 'bg-[var(--color-seller-surface-elevated)]',
		dot: 'bg-[var(--color-seller-border)]',
	},
	scheduled: {
		label: 'Scheduled',
		color: 'text-[var(--color-info)]',
		bg: 'bg-[var(--color-info-light)]',
		dot: 'bg-[var(--color-info)]',
	},
}

// ─────────────────────────────────────────────────────────────
// Empty form state builder
// ─────────────────────────────────────────────────────────────
function emptyForm(): Omit<SellerListing, 'id' | 'views' | 'addToCartCount' | 'conversionRate' | 'expiryRate' | 'createdAt' | 'updatedAt' | 'quantitySold' | 'moderationStatus'> {
	const now = new Date()
	const pickupStart = new Date(now.getTime() + 1 * 3600000)
	const pickupEnd = new Date(now.getTime() + 5 * 3600000)
	const expiresAt = new Date(now.getTime() + 8 * 3600000)

	return {
		name: '',
		description: '',
		images: [],
		category: 'bakery',
		dietaryTags: [],
		allergens: [],
		originalPrice: 0,
		discountedPrice: 0,
		discountPercent: 0,
		totalQuantity: 1,
		quantityAvailable: 1,
		unit: 'item',
		pickupStart: toLocalDatetimeStr(pickupStart),
		pickupEnd: toLocalDatetimeStr(pickupEnd),
		expiresAt: toLocalDatetimeStr(expiresAt),
		status: 'draft',
		co2SavedPerUnit: 0.5,
	}
}

// ─────────────────────────────────────────────────────────────
// Listing Card
// ─────────────────────────────────────────────────────────────
interface ListingCardProps {
	listing: SellerListing
	onEdit: (listing: SellerListing) => void
}

function ListingCard({ listing, onEdit }: ListingCardProps) {
	const { deleteListing, pauseListing, requestInspection } = useSellerStore()
	const { setAiPricingListingId, setAiPricingOpen } = useSellerUIStore()
	const [menuOpen, setMenuOpen] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [isRequestingInspection, setIsRequestingInspection] = useState(false)

	const cfg = STATUS_CONFIG[listing.status]
	const hasAISuggestion = aiPricingSuggestions.some((s) => s.listingId === listing.id)
	const soldPct =
		listing.totalQuantity > 0
			? Math.round((listing.quantitySold / listing.totalQuantity) * 100)
			: 0
	const minsToPickup = Math.floor(
		(new Date(listing.pickupStart).getTime() - Date.now()) / 60000,
	)
	const pickupLabel =
		minsToPickup > 0
			? minsToPickup < 60
				? `Pickup in ${minsToPickup}m`
				: `Pickup in ${Math.floor(minsToPickup / 60)}h`
			: 'Pickup window open'

	return (
		<motion.div variants={fadeIn} layout>
			<Card
				className={cn(
					'overflow-hidden border-[var(--color-seller-border)] shadow-none transition-shadow hover:shadow-md',
					listing.status === 'expired' && 'opacity-60',
				)}
			>
				<CardContent className='p-0'>
					<div className='flex gap-0'>
						{/* Image */}
						<div className='relative w-24 h-24 flex-shrink-0 sm:w-28 sm:h-28'>
							{listing.images[0] ? (
								<img
									src={listing.images[0]}
									alt={listing.name}
									className='w-full h-full object-cover'
								/>
							) : (
								<div className='w-full h-full bg-[var(--color-seller-surface-elevated)] flex items-center justify-center'>
									<ImageIcon size={20} className='text-[var(--color-seller-text-muted)]' />
								</div>
							)}
						{/* Status dot */}
						<div className='absolute top-2 left-2'>
							<span
								className={cn(
									'text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/60',
									cfg.bg,
									cfg.color,
								)}
							>
								{cfg.label}
							</span>
						</div>
						{/* Inspection badge */}
						{listing.moderationStatus && (
							<div className='absolute top-2 right-2'>
								<span
									className={cn(
										'text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white/60 flex items-center gap-0.5',
										listing.moderationStatus === 'approved'
											? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/40'
											: listing.moderationStatus === 'rejected'
												? 'bg-[var(--color-error-light)] text-[var(--color-error)] border-[var(--color-error)]/40'
												: 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[var(--color-warning)]/40',
									)}
								>
									<ShieldCheck size={8} />
									{listing.moderationStatus === 'approved'
										? 'Approved'
										: listing.moderationStatus === 'rejected'
											? 'Rejected'
											: 'In Review'}
								</span>
							</div>
						)}
							{/* AI badge */}
							{hasAISuggestion && (
								<div className='absolute bottom-2 left-2'>
									<button
										type='button'
										onClick={() => {
											setAiPricingListingId(listing.id)
											setAiPricingOpen(true)
										}}
										className='flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-seller-accent)] text-white hover:bg-[var(--color-seller-accent-hover)] transition-colors'
									>
										<Sparkles size={8} />
										AI
									</button>
								</div>
							)}
						</div>

						{/* Content */}
						<div className='flex-1 p-3 min-w-0'>
							<div className='flex items-start justify-between gap-2'>
								<div className='min-w-0'>
									<p className='text-sm font-bold text-[var(--color-seller-text-primary)] truncate'>
										{listing.name}
									</p>
									<p className='text-[11px] text-[var(--color-seller-text-muted)] mt-0.5 line-clamp-1'>
										{listing.description}
									</p>
								</div>

								{/* More menu */}
								<div className='relative flex-shrink-0'>
									<button
										type='button'
										onClick={() => setMenuOpen((v) => !v)}
										className='p-1.5 rounded-[var(--radius-md)] text-[var(--color-seller-text-muted)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
									>
										<MoreVertical size={14} />
									</button>
									<AnimatePresence>
										{menuOpen && (
											<motion.div
												initial={{ opacity: 0, scale: 0.95, y: -4 }}
												animate={{ opacity: 1, scale: 1, y: 0 }}
												exit={{ opacity: 0, scale: 0.95, y: -4 }}
												transition={{ duration: 0.15 }}
												className='absolute right-0 top-8 z-20 w-40 bg-[var(--color-seller-surface)] rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] shadow-lg overflow-hidden'
											>
												<button
													type='button'
													onClick={() => { onEdit(listing); setMenuOpen(false) }}
													className='w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-seller-text-primary)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
												>
													<Pencil size={13} /> Edit listing
												</button>
											<button
												type='button'
												onClick={() => { pauseListing(listing.id); setMenuOpen(false) }}
												className='w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-seller-text-primary)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
											>
												{listing.status === 'paused' ? (
													<><PlayCircle size={13} /> Unpause</>
												) : (
													<><PauseCircle size={13} /> Pause</>
												)}
											</button>
											{!listing.moderationStatus || listing.moderationStatus === 'rejected' ? (
												<button
													type='button'
													disabled={isRequestingInspection}
													onClick={async () => {
														setIsRequestingInspection(true)
														try { await requestInspection(listing.id) } finally { setIsRequestingInspection(false) }
														setMenuOpen(false)
													}}
													className='w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-info)] hover:bg-[var(--color-info-light)] transition-colors disabled:opacity-50'
												>
													{isRequestingInspection ? <Loader2 size={13} className='animate-spin' /> : <ShieldCheck size={13} />}
													Request Inspection
												</button>
											) : null}
												{hasAISuggestion && (
													<button
														type='button'
														onClick={() => {
															setAiPricingListingId(listing.id)
															setAiPricingOpen(true)
															setMenuOpen(false)
														}}
														className='w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-light)] transition-colors'
													>
														<Sparkles size={13} /> AI Pricing
													</button>
												)}
												<div className='h-px bg-[var(--color-seller-border-subtle)]' />
												{!confirmDelete ? (
													<button
														type='button'
														onClick={() => setConfirmDelete(true)}
														className='w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors'
													>
														<Trash2 size={13} /> Delete
													</button>
												) : (
													<button
														type='button'
														onClick={() => { deleteListing(listing.id); setMenuOpen(false); setConfirmDelete(false) }}
														className='w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-[var(--color-error)] hover:bg-[var(--color-error-light)] transition-colors'
													>
														<AlertTriangle size={13} /> Confirm Delete
													</button>
												)}
											</motion.div>
										)}
									</AnimatePresence>
									{menuOpen && (
										<button
											type='button'
											className='fixed inset-0 z-10'
											onClick={() => { setMenuOpen(false); setConfirmDelete(false) }}
										/>
									)}
								</div>
							</div>

							{/* Price row */}
							<div className='flex items-center gap-2 mt-2'>
								<span className='text-base font-bold font-[var(--font-display)] text-[var(--color-seller-accent)]'>
									{formatCurrency(listing.discountedPrice)}
								</span>
								<span className='text-xs text-[var(--color-seller-text-muted)] line-through'>
									{formatCurrency(listing.originalPrice)}
								</span>
								<span className='text-[10px] font-bold bg-[var(--color-seller-secondary)] text-[var(--color-seller-accent)] px-1.5 py-0.5 rounded-full'>
									{listing.discountPercent}% off
								</span>
							</div>

							{/* Stats row */}
							<div className='flex items-center gap-3 mt-2'>
								{/* Qty */}
								<div className='flex items-center gap-1 text-[11px] text-[var(--color-seller-text-muted)]'>
									<PackageOpen size={11} />
									<span>
										{listing.quantityAvailable}/{listing.totalQuantity}
									</span>
								</div>
								{/* Views */}
								<div className='flex items-center gap-1 text-[11px] text-[var(--color-seller-text-muted)]'>
									<Eye size={11} />
									<span>{listing.views}</span>
								</div>
								{/* Conversion */}
								{listing.conversionRate > 0 && (
									<div className='flex items-center gap-1 text-[11px] text-[var(--color-seller-text-muted)]'>
										<TrendingUp size={11} />
										<span>{listing.conversionRate}%</span>
									</div>
								)}
								{/* Pickup */}
								<div className='flex items-center gap-1 text-[11px] text-[var(--color-seller-text-muted)] ml-auto'>
									<Clock size={11} />
									<span className='truncate'>{pickupLabel}</span>
								</div>
							</div>

							{/* Sell progress bar */}
							{listing.totalQuantity > 0 && listing.status === 'active' && (
								<div className='mt-2'>
									<div className='h-1.5 w-full bg-[var(--color-seller-surface-elevated)] rounded-full overflow-hidden'>
										<div
											className='h-full bg-[var(--color-seller-accent)] rounded-full transition-all duration-500'
											style={{ width: `${soldPct}%` }}
										/>
									</div>
									<p className='text-[9px] text-[var(--color-seller-text-muted)] mt-0.5'>
										{listing.quantitySold} sold · {soldPct}% sold through
									</p>
								</div>
							)}

							{/* Quick edit row */}
							<div className='flex items-center gap-2 mt-2.5'>
								<button
									type='button'
									onClick={() => onEdit(listing)}
									className='flex items-center gap-1 text-[11px] font-semibold text-[var(--color-seller-accent)] hover:underline'
								>
									<Pencil size={10} /> Edit
								</button>
								<span className='text-[var(--color-seller-border)]'>·</span>
								<button
									type='button'
									onClick={() => pauseListing(listing.id)}
									className='flex items-center gap-1 text-[11px] font-semibold text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)]'
								>
									{listing.status === 'paused' ? (
										<><PlayCircle size={10} /> Unpause</>
									) : (
										<><PauseCircle size={10} /> Pause</>
									)}
								</button>
								{hasAISuggestion && (
									<>
										<span className='text-[var(--color-seller-border)]'>·</span>
										<button
											type='button'
											onClick={() => {
												setAiPricingListingId(listing.id)
												setAiPricingOpen(true)
											}}
											className='flex items-center gap-1 text-[11px] font-semibold text-[var(--color-seller-accent)] hover:underline'
										>
											<Sparkles size={10} /> AI price
										</button>
									</>
								)}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ─────────────────────────────────────────────────────────────
// Listing Form Sheet (Create / Edit)
// ─────────────────────────────────────────────────────────────

interface ListingFormSheetProps {
	open: boolean
	editListing: SellerListing | null
	onClose: () => void
}

type FormData = ReturnType<typeof emptyForm>

function ListingFormSheet({ open, editListing, onClose }: ListingFormSheetProps) {
	const { addListing, updateListing } = useSellerStore()
	const isEdit = !!editListing
	const imageInputRef = useRef<HTMLInputElement>(null)
	const [uploadSlot, setUploadSlot] = useState<number | null>(null)
	const [isUploadingImage, setIsUploadingImage] = useState(false)
	const [imageUploadError, setImageUploadError] = useState<string | null>(null)
	const [aiResult, setAiResult] = useState<AiPriceResponse | null>(null)
	const [isCalculatingPrice, setIsCalculatingPrice] = useState(false)
	const [aiPriceError, setAiPriceError] = useState<string | null>(null)
	const [isSaving, setIsSaving] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)

	const [form, setForm] = useState<FormData>(() =>
		editListing
			? {
					name: editListing.name,
					description: editListing.description,
					images: editListing.images,
					category: editListing.category,
					dietaryTags: editListing.dietaryTags,
					allergens: editListing.allergens,
					originalPrice: editListing.originalPrice,
					discountedPrice: editListing.discountedPrice,
					discountPercent: editListing.discountPercent,
					totalQuantity: editListing.totalQuantity,
					quantityAvailable: editListing.quantityAvailable,
					unit: editListing.unit,
					weight: editListing.weight,
					pickupStart: toLocalDatetimeStr(new Date(editListing.pickupStart)),
					pickupEnd: toLocalDatetimeStr(new Date(editListing.pickupEnd)),
					expiresAt: toLocalDatetimeStr(new Date(editListing.expiresAt)),
					status: editListing.status,
					co2SavedPerUnit: editListing.co2SavedPerUnit,
				}
			: emptyForm(),
	)

	// Sync form when editListing changes
	const [prevEdit, setPrevEdit] = useState(editListing)
	if (prevEdit !== editListing) {
		setPrevEdit(editListing)
		setForm(
			editListing
				? {
						name: editListing.name,
						description: editListing.description,
						images: editListing.images,
						category: editListing.category,
						dietaryTags: editListing.dietaryTags,
						allergens: editListing.allergens,
						originalPrice: editListing.originalPrice,
						discountedPrice: editListing.discountedPrice,
						discountPercent: editListing.discountPercent,
						totalQuantity: editListing.totalQuantity,
						quantityAvailable: editListing.quantityAvailable,
						unit: editListing.unit,
						weight: editListing.weight,
						prepTimeMinutes: editListing.prepTimeMinutes,
						pickupStart: toLocalDatetimeStr(new Date(editListing.pickupStart)),
						pickupEnd: toLocalDatetimeStr(new Date(editListing.pickupEnd)),
						expiresAt: toLocalDatetimeStr(new Date(editListing.expiresAt)),
						status: editListing.status,
						co2SavedPerUnit: editListing.co2SavedPerUnit,
					}
				: emptyForm(),
		)
	}

	const openFilePickerForSlot = (slotIndex: number) => {
		setUploadSlot(slotIndex)
		setImageUploadError(null)
		imageInputRef.current?.click()
	}

	const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		e.target.value = ''
		if (!file || uploadSlot === null) return

		setIsUploadingImage(true)
		setImageUploadError(null)
		try {
			const uploadedUrl = await uploadFile(file)
			setForm((prev) => {
				const next = [...prev.images]
				if (uploadSlot < next.length) {
					next[uploadSlot] = uploadedUrl
				} else if (next.length < MAX_IMAGE_UPLOADS) {
					next.push(uploadedUrl)
				}
				return { ...prev, images: next }
			})
		} catch {
			setImageUploadError('Image upload failed. Please try again.')
		} finally {
			setIsUploadingImage(false)
			setUploadSlot(null)
		}
	}

	const removeImage = (slotIndex: number) => {
		setForm((prev) => ({
			...prev,
			images: prev.images.filter((_, i) => i !== slotIndex),
		}))
	}

	const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
		setForm((f) => {
			const next = { ...f, [key]: value }
			// Auto-calc discount percent when prices change
			if ((key === 'originalPrice' || key === 'discountedPrice') && next.originalPrice > 0) {
				next.discountPercent = Math.max(
					0,
					Math.round(((next.originalPrice - next.discountedPrice) / next.originalPrice) * 100),
				)
			}
			// Auto-calc co2SavedPerUnit from weight × 2.5
			if (key === 'weight') {
				const w = typeof value === 'number' ? value : 0
				next.co2SavedPerUnit = w > 0 ? Math.round(w * 2.5 * 100) / 100 : 0
			}
			// Reset discounted price when original price changes so form is not valid with stale AI price
			if (key === 'originalPrice') {
				next.discountedPrice = 0
				next.discountPercent = 0
			}
			return next
		})
		// Reset AI result if any pricing-relevant field changes
		if (
			key === 'originalPrice' ||
			key === 'expiresAt' ||
			key === 'totalQuantity' ||
			key === 'name' ||
			key === 'category'
		) {
			setAiResult(null)
			setAiPriceError(null)
		}
	}, [])

	const toggleDietary = (tag: DietaryTag) => {
		setForm((f) => ({
			...f,
			dietaryTags: f.dietaryTags.includes(tag)
				? f.dietaryTags.filter((t) => t !== tag)
				: [...f.dietaryTags, tag],
		}))
	}

	const toggleAllergen = (a: string) => {
		setForm((f) => ({
			...f,
			allergens: f.allergens.includes(a)
				? f.allergens.filter((x) => x !== a)
				: [...f.allergens, a],
		}))
	}

	const handleSave = async (publishNow = false) => {
		setSaveError(null)
		setIsSaving(true)
		// In edit mode, weight cannot be changed — use existing listing weight for CO₂ calc
		const weight = form.weight ?? (isEdit ? (editListing?.weight ?? 0) : 0)
		const co2SavedPerUnit = weight > 0 ? Math.round(weight * 2.5 * 100) / 100 : 0
		const payload = {
			...form,
			co2SavedPerUnit,
			status: publishNow ? ('active' as const) : form.status,
			images: form.images.filter(Boolean),
		}

		try {
			if (isEdit && editListing) {
				await updateListing(editListing.id, payload)
			} else {
				await addListing(payload)
			}
			onClose()
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : 'Failed to save listing. Please try again.')
		} finally {
			setIsSaving(false)
		}
	}

	const handleCalculatePrice = async () => {
		if (!form.name.trim() || !form.originalPrice || !form.expiresAt || !form.totalQuantity) return
		setIsCalculatingPrice(true)
		setAiPriceError(null)
		// Clear previous result and reset discounted price so UI doesn't show stale data during load
		setAiResult(null)
		setForm((f) => ({ ...f, discountedPrice: 0, discountPercent: 0 }))
		try {
			const res = await sellerApi.calculateAiPrice({
				food_name: form.name.trim(),
				food_type: form.category ?? null,
				base_price: form.originalPrice,
				expires_at: parseDatetimeLocalAsIST(form.expiresAt).toISOString(),
				total_quantity: form.totalQuantity,
			})
			const envelope = res.data
			if (envelope.success && envelope.data) {
				setAiResult(envelope.data)
				setForm((f) => ({
					...f,
					discountedPrice: envelope.data!.discounted_price,
					discountPercent: Math.round(envelope.data!.discount_percent),
				}))
			} else {
				setAiPriceError('No data returned from pricing agent.')
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Pricing agent unavailable.'
			setAiPriceError(msg)
		} finally {
			setIsCalculatingPrice(false)
		}
	}

	const canCalculate =
		form.name.trim().length > 0 &&
		form.originalPrice > 0 &&
		form.expiresAt.length > 0 &&
		form.totalQuantity > 0

	const isValid = isEdit
		? form.quantityAvailable >= 0
		: canCalculate && form.discountedPrice > 0

	const inputCls =
		'border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] focus:border-[var(--color-seller-accent)] focus:ring-[var(--color-seller-accent)]/20 text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-disabled)]'

	const labelCls = 'block text-xs font-semibold text-[var(--color-seller-text-secondary)] mb-1.5'

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
						onClick={onClose}
					/>

					{/* Sheet */}
					<motion.div
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className='fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-[var(--color-seller-surface)] shadow-2xl flex flex-col'
					>
						{/* Header */}
						<div className='flex items-center justify-between px-5 py-4 border-b border-[var(--color-seller-border)] flex-shrink-0'>
							<div>
								<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
									{isEdit ? 'Edit Listing' : 'Create Listing'}
								</h2>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
									{isEdit ? `Editing: ${editListing?.name}` : 'Add a new surplus item to your store'}
								</p>
							</div>
							<button
								type='button'
								onClick={onClose}
								className='p-2 rounded-[var(--radius-md)] text-[var(--color-seller-text-muted)] hover:bg-[var(--color-seller-surface-elevated)] transition-colors'
							>
								<X size={18} />
							</button>
						</div>

						{/* Scrollable body */}
						<div className='flex-1 overflow-y-auto px-5 py-5 space-y-5'>
							{/* ── Basic Info ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>1</span>
									Basic Information
								</h3>
								{isEdit && (
									<div className='mb-3 flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-warning-light)] text-[var(--color-warning)] text-xs font-medium'>
										<Info size={12} />
										In edit mode, only quantity can be updated.
									</div>
								)}
								<div className='space-y-3'>
									<div>
										<label className={labelCls}>Item Name *</label>
										<Input
											className={inputCls}
											placeholder='e.g. Sourdough Loaf, Pastry Box'
											value={form.name}
											onChange={(e) => set('name', e.target.value)}
											disabled={isEdit}
										/>
									</div>
									<div>
										<label className={labelCls}>Description</label>
										<textarea
											rows={3}
											placeholder='Describe freshness, ingredients, serving size...'
											value={form.description}
											onChange={(e) => set('description', e.target.value)}
											disabled={isEdit}
											className={cn(
												'flex w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm resize-none',
												'focus:outline-none focus:ring-2 transition-colors duration-150',
												isEdit ? 'opacity-50 cursor-not-allowed' : '',
												inputCls,
											)}
										/>
									</div>
									<div className='grid grid-cols-2 gap-3'>
										<div>
											<label className={labelCls}>Category</label>
											<select
												value={form.category}
												onChange={(e) => set('category', e.target.value as FoodCategory)}
												disabled={isEdit}
												className={cn(
													'flex h-10 w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm appearance-none cursor-pointer',
													'focus:outline-none focus:ring-2 transition-colors duration-150',
													isEdit ? 'opacity-50 cursor-not-allowed' : '',
													inputCls,
												)}
											>
												{CATEGORY_OPTIONS.map((c) => (
													<option key={c.value} value={c.value}>
														{c.label}
													</option>
												))}
											</select>
										</div>
										<div>
											<label className={labelCls}>Unit</label>
											<Input
												className={inputCls}
												placeholder='e.g. loaf, box, kg'
												value={form.unit}
												onChange={(e) => set('unit', e.target.value)}
												disabled={isEdit}
											/>
										</div>
									</div>
								</div>
							</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── Image Upload ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>2</span>
									Upload Images
								</h3>
								<input
									ref={imageInputRef}
									type='file'
									accept='image/*'
									className='hidden'
									onChange={(e) => {
										void handleImageSelected(e)
									}}
								/>
								<div className={cn('grid grid-cols-3 gap-2', isEdit && 'opacity-50 pointer-events-none')}>
									{Array.from({ length: Math.min(form.images.length + 1, MAX_IMAGE_UPLOADS) }).map((_, idx) => {
										const url = form.images[idx]
										const isCurrentSlotUploading = isUploadingImage && uploadSlot === idx
										return (
											<div
												key={idx}
												role='button'
												tabIndex={0}
												onClick={() => openFilePickerForSlot(idx)}
												onKeyDown={(ev) => {
													if (ev.key === 'Enter' || ev.key === ' ') {
														ev.preventDefault()
														openFilePickerForSlot(idx)
													}
												}}
												className={cn(
													'relative aspect-square rounded-[var(--radius-md)] border border-[var(--color-seller-border)] overflow-hidden',
													'bg-[var(--color-seller-surface-card)] hover:border-[var(--color-seller-accent)] transition-colors',
												)}
											>
												{url ? (
													<img src={url} alt={`Image ${idx + 1}`} className='w-full h-full object-cover' />
												) : (
													<div className='w-full h-full flex flex-col items-center justify-center gap-1 text-[var(--color-seller-text-muted)]'>
														{isCurrentSlotUploading ? <Loader2 size={16} className='animate-spin' /> : <Upload size={16} />}
														<span className='text-[10px] font-medium'>Image {idx + 1}</span>
													</div>
												)}
												{url && (
													<div className='absolute inset-x-0 bottom-0 bg-black/55 text-white text-[10px] py-1 text-center'>
														Click to replace
													</div>
												)}
												{url && (
													<div className='absolute top-1 right-1'>
														<button
															type='button'
															onClick={(ev) => {
																ev.stopPropagation()
																removeImage(idx)
															}}
															className='w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/75'
														>
															<X size={12} />
														</button>
													</div>
												)}
											</div>
										)
									})}
								</div>
								<p className='text-[11px] text-[var(--color-seller-text-muted)] mt-2'>
									Tap any image slot to upload. You can upload up to {MAX_IMAGE_UPLOADS} images.
								</p>
								{imageUploadError && (
									<p className='text-[11px] text-[var(--color-error)] mt-1'>{imageUploadError}</p>
								)}
							</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── Pricing ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>3</span>
									Pricing & Quantity
								</h3>
								<div className='space-y-3'>
									<div>
										<label className={labelCls}>Original Price / MRP (₹) *</label>
										<div className='relative'>
											<IndianRupee size={13} className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)]' />
											<Input
												type='number'
												min={0}
												className={cn(inputCls, 'pl-8')}
												placeholder='0'
												value={form.originalPrice || ''}
												onChange={(e) => set('originalPrice', Number(e.target.value))}
												disabled={isEdit}
											/>
										</div>
									</div>
									<div className='grid grid-cols-2 gap-3'>
										<div>
											<label className={labelCls}>Total Quantity *</label>
											<Input
												type='number'
												min={1}
												className={inputCls}
												value={form.totalQuantity || ''}
												onChange={(e) => {
													const q = Number(e.target.value)
													set('totalQuantity', q)
													set('quantityAvailable', q)
												}}
												disabled={isEdit}
											/>
										</div>
										<div>
											<label className={labelCls}>Weight per Unit (kg)</label>
											<Input
												type='number'
												min={0}
												step={0.1}
												className={inputCls}
												placeholder='0.5'
												value={form.weight ?? ''}
												onChange={(e) => set('weight', e.target.value ? Number(e.target.value) : undefined)}
												disabled={isEdit}
											/>
										</div>
									</div>
									{isEdit && (
										<div>
											<label className={labelCls}>
												<span className='flex items-center gap-1'>
													Available Quantity
													<span className='text-[var(--color-seller-accent)] font-bold'>(editable)</span>
												</span>
											</label>
											<Input
												type='number'
												min={0}
												className={inputCls}
												value={form.quantityAvailable || ''}
												onChange={(e) => set('quantityAvailable', Number(e.target.value))}
											/>
										</div>
									)}
							</div>
						</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── Pickup Window ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>4</span>
									Pickup Window & Expiry
								</h3>
								<div className='space-y-3'>
									<div className='grid grid-cols-2 gap-3'>
										<div>
											<label className={labelCls}>Pickup From</label>
											<Input
												type='datetime-local'
												className={inputCls}
												value={form.pickupStart}
												onChange={(e) => set('pickupStart', e.target.value)}
												disabled={isEdit}
											/>
										</div>
										<div>
											<label className={labelCls}>Pickup Until</label>
											<Input
												type='datetime-local'
												className={inputCls}
												value={form.pickupEnd}
												onChange={(e) => set('pickupEnd', e.target.value)}
												disabled={isEdit}
											/>
										</div>
									</div>
									<div>
										<label className={labelCls}>Item Expires At</label>
										<Input
											type='datetime-local'
											className={inputCls}
											value={form.expiresAt}
											onChange={(e) => set('expiresAt', e.target.value)}
											disabled={isEdit}
										/>
									</div>
								</div>
							</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── Dietary Tags ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>5</span>
									Dietary & Allergens
								</h3>
								<div className='space-y-3'>
									<div>
										<label className={labelCls}>Dietary Tags</label>
										<div className='flex flex-wrap gap-2'>
										{DIETARY_OPTIONS.map((d) => (
											<button
												key={d.value}
												type='button'
												onClick={() => !isEdit && toggleDietary(d.value)}
												disabled={isEdit}
												className={cn(
													'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
													isEdit ? 'opacity-50 cursor-not-allowed' : '',
													form.dietaryTags.includes(d.value)
														? 'bg-[var(--color-seller-accent)] text-white border-[var(--color-seller-accent)]'
														: 'bg-transparent text-[var(--color-seller-text-secondary)] border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)]',
												)}
											>
													<span>{d.icon}</span> {d.label}
													{form.dietaryTags.includes(d.value) && <Check size={10} />}
												</button>
											))}
										</div>
									</div>
									<div>
										<label className={labelCls}>Allergens Present</label>
										<div className='flex flex-wrap gap-2'>
										{ALLERGEN_OPTIONS.map((a) => (
											<button
												key={a}
												type='button'
												onClick={() => !isEdit && toggleAllergen(a)}
												disabled={isEdit}
												className={cn(
													'px-2.5 py-1 rounded-full text-xs font-medium border capitalize transition-all duration-150',
													isEdit ? 'opacity-50 cursor-not-allowed' : '',
													form.allergens.includes(a)
														? 'bg-[var(--color-error-light)] text-[var(--color-error)] border-[var(--color-error)]'
														: 'bg-transparent text-[var(--color-seller-text-muted)] border-[var(--color-seller-border)] hover:border-[var(--color-seller-text-muted)]',
												)}
											>
													{a}
												</button>
											))}
										</div>
									</div>
								</div>
							</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── Sustainability ── */}
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>6</span>
									Sustainability Impact
								</h3>
							{(() => {
								const weight = form.weight ?? (isEdit ? (editListing?.weight ?? 0) : 0)
								const qty = form.quantityAvailable || form.totalQuantity || 0
									const co2PerUnit = weight > 0 ? Math.round(weight * 2.5 * 100) / 100 : 0
									const co2Total = Math.round(co2PerUnit * qty * 100) / 100
									const trees = co2Total > 0 ? Math.round((co2Total / 21.9) * 100) / 100 : 0
									const hasData = weight > 0 && qty > 0
									return hasData ? (
										<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-accent)]/30 bg-[var(--color-seller-accent-light)] p-4 space-y-3'>
											<div className='grid grid-cols-3 gap-3'>
												<div className='text-center'>
													<p className='text-[10px] font-semibold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-1'>CO₂ / Unit</p>
													<p className='text-lg font-bold text-[var(--color-seller-accent)]'>{co2PerUnit} kg</p>
												</div>
												<div className='text-center border-x border-[var(--color-seller-accent)]/20'>
													<p className='text-[10px] font-semibold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-1'>Total CO₂</p>
													<p className='text-lg font-bold text-[var(--color-seller-accent)]'>{co2Total} kg</p>
												</div>
												<div className='text-center'>
													<p className='text-[10px] font-semibold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-1'>Trees Eq.</p>
													<p className='text-lg font-bold text-[var(--color-seller-accent)]'>{trees}</p>
												</div>
											</div>
											<p className='text-[11px] text-[var(--color-seller-text-muted)] flex items-center gap-1'>
												<Info size={10} />
												Auto-calculated: weight × 2.5 = CO₂/unit · total CO₂ ÷ 21.9 = trees equivalent
											</p>
										</div>
									) : (
										<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] bg-[var(--color-seller-surface-elevated)] p-4'>
											<p className='text-[12px] text-[var(--color-seller-text-muted)] flex items-center gap-1.5'>
												<Info size={12} />
												Enter item weight (in section 3) to see CO₂ impact automatically calculated.
											</p>
										</div>
									)
								})()}
							</section>

							<div className='h-px bg-[var(--color-seller-border-subtle)]' />

							{/* ── AI Pricing ── */}
							{!isEdit && (
							<section>
								<h3 className='text-sm font-bold text-[var(--color-seller-text-primary)] mb-3 flex items-center gap-2'>
									<span className='w-5 h-5 rounded-full bg-[var(--color-seller-accent)] text-white text-[10px] font-bold flex items-center justify-center'>7</span>
									AI Pricing
								</h3>
								<div className='space-y-3'>
									<p className='text-[11px] text-[var(--color-seller-text-muted)]'>
										The AI agent analyses expiry time, inventory, demand, and weather to calculate the optimal selling price. Fill in the item name, original price, expiry, and quantity above first.
									</p>
									<Button
										type='button'
										onClick={handleCalculatePrice}
										disabled={!canCalculate || isCalculatingPrice}
										className='w-full bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white disabled:opacity-50 flex items-center gap-2'
									>
										{isCalculatingPrice ? (
											<><Loader2 size={14} className='animate-spin' /> Calculating…</>
										) : (
											<><Bot size={14} /> Calculate Price</>
										)}
									</Button>

									{aiPriceError && (
										<div className='flex items-start gap-2 px-3 py-2 bg-[var(--color-error-light)] rounded-[var(--radius-md)]'>
											<AlertTriangle size={13} className='text-[var(--color-error)] mt-0.5 shrink-0' />
											<p className='text-xs text-[var(--color-error)]'>{aiPriceError}</p>
										</div>
									)}

									{aiResult && (
										<div className='rounded-[var(--radius-lg)] border border-[var(--color-seller-accent)]/40 bg-[var(--color-seller-accent-light)] p-4 space-y-3'>
											{/* Price display */}
											<div className='flex items-center justify-between'>
												<div>
													<p className='text-[10px] font-semibold text-[var(--color-seller-text-muted)] uppercase tracking-wide'>AI Selling Price</p>
													<p className='text-2xl font-bold text-[var(--color-seller-text-primary)]'>
														{formatCurrency(aiResult.discounted_price)}
													</p>
												</div>
												<div className='text-right'>
													<span className='inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--color-seller-accent)] text-white text-xs font-bold'>
														<Zap size={11} />
														{Math.round(aiResult.discount_percent)}% off
													</span>
													<p className='text-[10px] text-[var(--color-seller-text-muted)] mt-1'>
														original {formatCurrency(form.originalPrice)}
													</p>
												</div>
											</div>

											<div className='h-px bg-[var(--color-seller-accent)]/20' />

										{/* Breakdown */}
										<div className='space-y-1.5'>
											<p className='text-[10px] font-semibold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-2'>Pricing Breakdown</p>
											{[
												{ label: 'Category', value: aiResult.pricing_factors.category },
												{ label: 'Shelf life left', value: `${aiResult.remaining_shelf_life_hours}h` },
												{ label: 'Expiry discount', value: `${Math.round(aiResult.pricing_factors.expiry_discount * 100)}%` },
												{ label: 'Inventory discount', value: `${Math.round(aiResult.pricing_factors.inventory_discount * 100)}%` },
												{ label: 'Urgency discount', value: `${Math.round(aiResult.pricing_factors.urgency_discount * 100)}%` },
												{ label: 'Demand adj.', value: `${aiResult.pricing_factors.demand_adjustment >= 0 ? '+' : ''}${Math.round(aiResult.pricing_factors.demand_adjustment * 100)}%` },
												{ label: 'NGO priority', value: aiResult.pricing_factors.ngo_priority ? 'Yes' : 'No' },
											].map(({ label, value }) => (
												<div key={label} className='flex justify-between items-center'>
													<span className='text-[11px] text-[var(--color-seller-text-secondary)]'>{label}</span>
													<span className={`text-[11px] font-semibold ${label === 'NGO priority' && aiResult.pricing_factors.ngo_priority ? 'text-amber-600' : 'text-[var(--color-seller-text-primary)]'}`}>{value}</span>
												</div>
											))}
											{aiResult.pricing_factors.ngo_priority && aiResult.pricing_factors.ngo_action && (
												<div className='mt-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] bg-amber-50 border border-amber-200 flex items-start gap-1.5'>
													<Info size={10} className='text-amber-600 mt-0.5 flex-shrink-0' />
													<span className='text-[10px] text-amber-700 font-medium'>{aiResult.pricing_factors.ngo_action}</span>
												</div>
											)}
										</div>

											<p className='text-[10px] text-[var(--color-seller-text-muted)] flex items-center gap-1'>
												<Info size={10} />
												Reprices every {aiResult.pricing_factors.reprice_interval_minutes} min. Recalculate before publishing if expiry changed.
											</p>
										</div>
									)}
								</div>
							</section>
							)}

							{/* Bottom padding */}
							<div className='h-2' />
						</div>

						{/* Footer actions */}
						<div className='flex-shrink-0 border-t border-[var(--color-seller-border)] px-5 py-4 space-y-2 bg-[var(--color-seller-surface)]'>
						{saveError && (
							<p className='text-xs text-red-600 flex items-center gap-1.5 mb-2'>
								<AlertTriangle size={11} />
								{saveError}
							</p>
						)}
					{!isValid && !isEdit && (
						<p className='text-xs text-[var(--color-seller-text-muted)] flex items-center gap-1.5 mb-2'>
							<AlertTriangle size={11} className='text-[var(--color-warning)]' />
							{!canCalculate
								? 'Fill in item name, original price, expiry, and quantity — then calculate AI price.'
								: 'Use "Calculate Price" in Section 7 to get an AI-suggested selling price.'}
						</p>
					)}
							<div className='flex gap-2'>
								<Button
									variant='outline'
									className='flex-1 border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)] hover:bg-[var(--color-seller-surface-elevated)]'
									onClick={() => handleSave(false)}
									disabled={!isValid || isSaving}
								>
									{isSaving ? <Loader2 size={14} className='animate-spin mr-1' /> : null}
									Save as Draft
								</Button>
								<Button
									className='flex-1 bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white'
									onClick={() => handleSave(true)}
									disabled={!isValid || isSaving}
								>
									{isSaving ? <Loader2 size={14} className='animate-spin mr-1' /> : null}
									{isEdit ? 'Save & Publish' : 'Publish Now'}
								</Button>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

// ─────────────────────────────────────────────────────────────
// AI Pricing Sheet
// ─────────────────────────────────────────────────────────────
function AIPricingSheet() {
	const { aiPricingOpen, aiPricingListingId, setAiPricingOpen, setAiPricingListingId } =
		useSellerUIStore()
	const { listings, updateListing } = useSellerStore()

	const suggestion = aiPricingSuggestions.find((s) => s.listingId === aiPricingListingId)
	const listing = listings.find((l) => l.id === aiPricingListingId)

	const [applied, setApplied] = useState(false)

	const handleApply = () => {
		if (!suggestion || !listing) return
		updateListing(listing.id, {
			discountedPrice: suggestion.suggestedPrice,
			discountPercent: suggestion.suggestedDiscount,
		})
		setApplied(true)
		setTimeout(() => {
			setApplied(false)
			setAiPricingOpen(false)
			setAiPricingListingId(null)
		}, 1500)
	}

	const handleClose = () => {
		setAiPricingOpen(false)
		setAiPricingListingId(null)
		setApplied(false)
	}

	const demandColors: Record<string, string> = {
		high: 'text-[var(--color-success)] bg-[var(--color-success-light)]',
		medium: 'text-[var(--color-warning)] bg-[var(--color-warning-light)]',
		low: 'text-[var(--color-error)] bg-[var(--color-error-light)]',
	}
	const urgencyColors: Record<string, string> = {
		high: 'text-[var(--color-error)] bg-[var(--color-error-light)]',
		medium: 'text-[var(--color-warning)] bg-[var(--color-warning-light)]',
		low: 'text-[var(--color-success)] bg-[var(--color-success-light)]',
	}

	return (
		<AnimatePresence>
			{aiPricingOpen && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className='fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
						onClick={handleClose}
					/>
					<motion.div
						initial={{ y: '100%' }}
						animate={{ y: 0 }}
						exit={{ y: '100%' }}
						transition={{ type: 'spring', stiffness: 300, damping: 30 }}
						className='fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto bg-[var(--color-seller-surface)] rounded-t-[var(--radius-2xl)] shadow-2xl overflow-hidden'
					>
						{/* Handle */}
						<div className='flex justify-center pt-3 pb-1'>
							<div className='w-10 h-1 rounded-full bg-[var(--color-seller-border)]' />
						</div>

						{/* Header */}
						<div
							className='px-5 pt-3 pb-4'
							style={{
								background: 'linear-gradient(135deg, #8a4a00 0%, #b35c00 60%, #d97706 100%)',
							}}
						>
							<div className='flex items-start justify-between'>
								<div className='flex items-center gap-2'>
									<div className='w-8 h-8 rounded-[var(--radius-md)] bg-white/20 flex items-center justify-center'>
										<Sparkles size={16} className='text-white' />
									</div>
									<div>
										<p className='text-[10px] text-white/70 font-medium'>AI Pricing Engine</p>
										<h2 className='text-base font-bold font-[var(--font-display)] text-white'>
											Smart Price Suggestion
										</h2>
									</div>
								</div>
								<button
									type='button'
									onClick={handleClose}
									className='p-1.5 rounded-[var(--radius-md)] text-white/70 hover:bg-white/20 transition-colors'
								>
									<X size={16} />
								</button>
							</div>
						</div>

						<div className='px-5 py-5 space-y-4 max-h-[70vh] overflow-y-auto'>
							{!suggestion || !listing ? (
								<p className='text-sm text-[var(--color-seller-text-muted)] text-center py-8'>
									No AI suggestion available for this listing.
								</p>
							) : applied ? (
								<motion.div
									initial={{ scale: 0.9, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									className='flex flex-col items-center gap-3 py-8'
								>
									<div className='w-14 h-14 rounded-full bg-[var(--color-success-light)] flex items-center justify-center'>
										<Check size={28} className='text-[var(--color-success)]' />
									</div>
									<p className='text-base font-bold text-[var(--color-seller-text-primary)]'>
										Price Updated!
									</p>
									<p className='text-xs text-[var(--color-seller-text-muted)]'>
										{listing.name} is now listed at {formatCurrency(suggestion.suggestedPrice)}
									</p>
								</motion.div>
							) : (
								<>
									{/* Listing info */}
									<div className='flex items-center gap-3 p-3 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)]'>
										{listing.images[0] && (
											<img
												src={listing.images[0]}
												alt={listing.name}
												className='w-12 h-12 rounded-[var(--radius-md)] object-cover flex-shrink-0'
											/>
										)}
										<div className='min-w-0'>
											<p className='text-sm font-bold text-[var(--color-seller-text-primary)] truncate'>
												{listing.name}
											</p>
											<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5'>
												{listing.quantityAvailable} units left · {listing.views} views
											</p>
										</div>
									</div>

									{/* Price comparison */}
									<div className='grid grid-cols-2 gap-3'>
										<div className='p-3 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)] text-center'>
											<p className='text-[10px] text-[var(--color-seller-text-muted)] mb-1'>Current Price</p>
											<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
												{formatCurrency(suggestion.currentPrice)}
											</p>
										</div>
										<div className='p-3 bg-[var(--color-seller-accent-light)] rounded-[var(--radius-lg)] text-center border border-[var(--color-seller-accent-muted)]'>
											<p className='text-[10px] text-[var(--color-seller-accent)] mb-1'>Suggested Price</p>
											<p className='text-xl font-bold font-[var(--font-display)] text-[var(--color-seller-accent)]'>
												{formatCurrency(suggestion.suggestedPrice)}
											</p>
										</div>
									</div>

									{/* Confidence + signals */}
									<div className='space-y-2'>
										<div className='flex items-center justify-between text-xs'>
											<span className='text-[var(--color-seller-text-muted)]'>AI Confidence</span>
											<span className='font-bold text-[var(--color-seller-text-primary)]'>
												{suggestion.confidence}%
											</span>
										</div>
										<div className='h-2 bg-[var(--color-seller-surface-elevated)] rounded-full overflow-hidden'>
											<motion.div
												initial={{ width: 0 }}
												animate={{ width: `${suggestion.confidence}%` }}
												transition={{ duration: 0.8, ease: 'easeOut' }}
												className='h-full bg-[var(--color-seller-accent)] rounded-full'
											/>
										</div>
									</div>

									{/* Demand & Urgency signals */}
									<div className='flex gap-2'>
									<div className={cn('flex-1 flex items-center gap-2 p-2.5 rounded-[var(--radius-md)]', demandColors[suggestion.demandLevel ?? 'medium'])}>
											<TrendingUp size={13} />
											<div>
												<p className='text-[9px] font-medium opacity-70'>Demand</p>
												<p className='text-xs font-bold capitalize'>{suggestion.demandLevel}</p>
											</div>
										</div>
									<div className={cn('flex-1 flex items-center gap-2 p-2.5 rounded-[var(--radius-md)]', urgencyColors[suggestion.expiryUrgency ?? 'medium'])}>
											<Clock size={13} />
											<div>
												<p className='text-[9px] font-medium opacity-70'>Expiry Urgency</p>
												<p className='text-xs font-bold capitalize'>{suggestion.expiryUrgency}</p>
											</div>
										</div>
									</div>

									{/* Reasoning */}
									<div className='p-3 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)]'>
										<p className='text-[10px] font-bold text-[var(--color-seller-text-muted)] uppercase tracking-wide mb-1.5'>
											Why this price?
										</p>
										<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>
											{suggestion.reasoning}
										</p>
									</div>

									{/* Weather note */}
									{suggestion.weatherImpact && (
										<div className='flex items-start gap-2 p-3 bg-[var(--color-info-light)] rounded-[var(--radius-lg)]'>
											<Sun size={16} className='flex-shrink-0 mt-0.5 text-[var(--color-info)]' />
											<p className='text-xs text-[var(--color-info)] leading-relaxed'>
												{suggestion.weatherImpact}
											</p>
										</div>
									)}

									{/* More suggestions row */}
									{aiPricingSuggestions.length > 1 && (
										<div className='p-3 bg-[var(--color-seller-surface-elevated)] rounded-[var(--radius-lg)]'>
											<p className='text-xs font-semibold text-[var(--color-seller-text-primary)] mb-2'>
												Other suggestions
											</p>
										{aiPricingSuggestions
												.filter((s) => s.listingId !== aiPricingListingId)
												.map((s) => {
													const l = listings.find((x) => x.id === s.listingId)
													return (
														<button
															key={s.listingId}
															type='button'
															onClick={() => {
																setAiPricingListingId(s.listingId)
																setApplied(false)
															}}
															className='w-full flex items-center justify-between py-1.5 text-left hover:opacity-80 transition-opacity'
														>
															<span className='text-xs text-[var(--color-seller-text-primary)] truncate'>
																{l?.name ?? s.listingId}
															</span>
															<div className='flex items-center gap-1.5 flex-shrink-0'>
																<span className='text-xs font-bold text-[var(--color-seller-accent)]'>
																	{formatCurrency(s.currentPrice)} → {formatCurrency(s.suggestedPrice)}
																</span>
																<ChevronRight size={12} className='text-[var(--color-seller-text-muted)]' />
															</div>
														</button>
													)
												})}
										</div>
									)}
								</>
							)}
						</div>

						{/* Footer */}
						{!applied && suggestion && (
							<div className='px-5 py-4 border-t border-[var(--color-seller-border)] flex gap-2'>
								<Button
									variant='outline'
									className='flex-1 border-[var(--color-seller-border)] text-[var(--color-seller-text-secondary)]'
									onClick={handleClose}
								>
									Keep Current Price
								</Button>
								<Button
									className='flex-1 bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white gap-1.5'
									onClick={handleApply}
								>
									<Sparkles size={14} />
									Apply {formatCurrency(suggestion.suggestedPrice)}
								</Button>
							</div>
						)}
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)
}

// ─────────────────────────────────────────────────────────────
// Main Listings Page
// ─────────────────────────────────────────────────────────────
export function SellerListingsPage() {
	const { listingId } = useParams<{ listingId?: string }>()
	const navigate = useNavigate()
	const { listings } = useSellerStore()

	const [activeTab, setActiveTab] = useState<ListingStatus | 'all'>('all')
	const [search, setSearch] = useState('')
	const [formOpen, setFormOpen] = useState(false)
	const [editListing, setEditListing] = useState<SellerListing | null>(null)

	// Open edit form if URL contains a listingId
	const [handledUrlId, setHandledUrlId] = useState<string | undefined>(undefined)
	if (listingId && handledUrlId !== listingId) {
		setHandledUrlId(listingId)
		const found = listings.find((l) => l.id === listingId)
		if (found) {
			setEditListing(found)
			setFormOpen(true)
		}
	}

	const handleOpenCreate = () => {
		setEditListing(null)
		setFormOpen(true)
	}

	const handleEdit = (listing: SellerListing) => {
		setEditListing(listing)
		setFormOpen(true)
	}

	const handleCloseForm = () => {
		setFormOpen(false)
		setEditListing(null)
		if (listingId) navigate('/seller/listings', { replace: true })
	}

	// Filtered listings
	const filtered = listings.filter((l) => {
		const matchesTab = activeTab === 'all' || l.status === activeTab
		const matchesSearch =
			!search ||
			l.name.toLowerCase().includes(search.toLowerCase()) ||
			l.description.toLowerCase().includes(search.toLowerCase())
		return matchesTab && matchesSearch
	})

	// Status counts
	const counts = STATUS_TABS.reduce<Record<string, number>>(
		(acc, tab) => {
			acc[tab.value] =
				tab.value === 'all'
					? listings.length
					: listings.filter((l) => l.status === tab.value).length
			return acc
		},
		{},
	)

	const aiSuggestionCount = aiPricingSuggestions.length

	return (
		<>
			<motion.div
				variants={staggerContainer}
				initial='hidden'
				animate='visible'
				className='space-y-5 pb-8'
			>
				{/* ── Header ── */}
				<motion.div variants={slideUp} className='flex items-start justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Listings
						</h1>
						<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
							{listings.length} total · {counts.active ?? 0} active
						</p>
					</div>
					<Button
						onClick={handleOpenCreate}
						className='bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white rounded-[var(--radius-lg)] gap-1.5 flex-shrink-0'
					>
						<Plus size={15} />
						<span className='hidden sm:inline'>New Listing</span>
					</Button>
				</motion.div>

				{/* ── AI Pricing Banner (if suggestions active) ── */}
				{aiSuggestionCount > 0 && (
					<motion.div variants={slideUp}>
						<button
							type='button'
							onClick={() => {
								const { setAiPricingListingId, setAiPricingOpen } = useSellerUIStore.getState()
								setAiPricingListingId(aiPricingSuggestions[0].listingId)
								setAiPricingOpen(true)
							}}
							className='w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-xl)] border border-[var(--color-seller-accent-muted)] bg-[var(--color-seller-accent-light)] hover:shadow-md transition-shadow text-left'
						>
							<div className='w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-seller-accent)] flex items-center justify-center flex-shrink-0'>
								<Sparkles size={15} className='text-white' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-bold text-[var(--color-seller-accent)]'>
									AI Pricing Suggestions Available
								</p>
								<p className='text-xs text-[var(--color-seller-text-muted)]'>
									{aiSuggestionCount} listing{aiSuggestionCount > 1 ? 's' : ''} can be optimised to increase sell-through
								</p>
							</div>
							<ChevronRight size={16} className='text-[var(--color-seller-accent)] flex-shrink-0' />
						</button>
					</motion.div>
				)}

				{/* ── Search ── */}
				<motion.div variants={slideUp} className='relative'>
					<Search
						size={16}
						className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)]'
					/>
					<input
						type='text'
						placeholder='Search listings...'
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className='w-full h-10 pl-9 pr-4 rounded-[var(--radius-lg)] border border-[var(--color-seller-border)] bg-[var(--color-seller-surface-card)] text-sm text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-muted)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-2 focus:ring-[var(--color-seller-accent)]/20 transition-colors'
					/>
					{search && (
						<button
							type='button'
							onClick={() => setSearch('')}
							className='absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)] transition-colors'
						>
							<X size={14} />
						</button>
					)}
				</motion.div>

				{/* ── Status Filter Tabs (scrollable) ── */}
				<motion.div variants={slideUp} className='flex gap-2 overflow-x-auto no-scrollbar pb-1'>
					{STATUS_TABS.map((tab) => {
						const count = counts[tab.value] ?? 0
						if (tab.value !== 'all' && count === 0) return null
						return (
							<button
								key={tab.value}
								type='button'
								onClick={() => setActiveTab(tab.value)}
								className={cn(
									'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 flex-shrink-0',
									activeTab === tab.value
										? 'bg-[var(--color-seller-accent)] text-white border-[var(--color-seller-accent)]'
										: 'bg-transparent text-[var(--color-seller-text-secondary)] border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)]',
								)}
							>
								{tab.label}
								<span
									className={cn(
										'w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold',
										activeTab === tab.value
											? 'bg-white/20 text-white'
											: 'bg-[var(--color-seller-surface-elevated)] text-[var(--color-seller-text-muted)]',
									)}
								>
									{count}
								</span>
							</button>
						)
					})}
				</motion.div>

				{/* ── Listings ── */}
				{filtered.length === 0 ? (
					<motion.div
						variants={scaleIn}
						className='flex flex-col items-center gap-3 py-16 text-center'
					>
						<div className='w-14 h-14 rounded-2xl bg-[var(--color-seller-surface-elevated)] flex items-center justify-center'>
							<PackageOpen size={24} className='text-[var(--color-seller-text-muted)]' />
						</div>
						<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>
							{search ? 'No listings match your search' : 'No listings yet'}
						</p>
						<p className='text-xs text-[var(--color-seller-text-muted)]'>
							{search
								? 'Try a different keyword'
								: 'Create your first listing to start selling surplus food'}
						</p>
						{!search && (
							<Button
								onClick={handleOpenCreate}
								className='mt-2 bg-[var(--color-seller-accent)] hover:bg-[var(--color-seller-accent-hover)] text-white gap-1.5'
							>
								<Plus size={14} />
								Create Listing
							</Button>
						)}
					</motion.div>
				) : (
					<motion.div variants={staggerContainer} className='space-y-3'>
						{filtered.map((listing) => (
							<ListingCard key={listing.id} listing={listing} onEdit={handleEdit} />
						))}
					</motion.div>
				)}

				<div className='h-4' />
			</motion.div>

			{/* ── Form Sheet ── */}
			<ListingFormSheet
				open={formOpen}
				editListing={editListing}
				onClose={handleCloseForm}
			/>

			{/* ── AI Pricing Sheet ── */}
			<AIPricingSheet />
		</>
	)
}
