import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
	MapPin,
	Clock,
	Phone,
	Mail,
	Star,
	ShoppingBag,
	Leaf,
	Wind,
	UtensilsCrossed,
	Edit3,
	CheckCircle2,
	AlertCircle,
	Camera,
	ChevronRight,
	ExternalLink,
	Loader2,
	AlertTriangle,
	LogOut,
	FileText,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { profileApi, sellerApi, uploadFile, type SellerProfileOut, type SellerProfilePayload } from '@/lib/api'

// ── Helpers ─────────────────────────────────────────────────
function formatCompact(n: number): string {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
	return String(n)
}

function formatMemberSince(iso: string): string {
	return new Date(iso).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

const CATEGORY_LABELS: Record<string, string> = {
	bakery: 'Bakery',
	restaurant: 'Restaurant',
	cafe: 'Cafe',
	grocery: 'Grocery',
	sweets: 'Sweets & Desserts',
	cloud_kitchen: 'Cloud Kitchen',
	catering: 'Catering',
}

/** Parse the closed_days JSON string stored in the DB, e.g. '["Sunday","Monday"]' */
function parseClosedDays(raw: string | null | undefined): string[] {
	if (!raw) return []
	try {
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? parsed : []
	} catch {
		return []
	}
}

// ── Verification Badge ───────────────────────────────────────
function VerificationBadge({ status }: { status: string }) {
	if (status === 'verified') {
		return (
			<div className='flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-seller-eco-muted)] border border-[var(--color-seller-eco-light)]'>
				<CheckCircle2 size={11} className='text-[#2d8a4e]' />
				<span className='text-[10px] font-semibold text-[#2d8a4e]'>Verified</span>
			</div>
		)
	}
	if (status === 'pending' || status === 'under_review') {
		return (
			<div className='flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-warning-light)] border border-amber-200'>
				<AlertCircle size={11} className='text-amber-600' />
				<span className='text-[10px] font-semibold text-amber-600'>Under Review</span>
			</div>
		)
	}
	return null
}

// ── Info Row ────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
	return (
		<div className='flex items-start gap-3 py-2.5'>
			<span className='text-[var(--color-seller-text-muted)] mt-0.5 flex-shrink-0'>{icon}</span>
			<div className='flex-1 min-w-0'>
				<p className='text-[11px] text-[var(--color-seller-text-muted)] mb-0.5'>{label}</p>
				<p className='text-sm text-[var(--color-seller-text-primary)] font-medium'>{value}</p>
			</div>
		</div>
	)
}

// ── Stat Pill ────────────────────────────────────────────────
function StatPill({
	icon,
	label,
	value,
	iconColor,
	bgColor,
}: {
	icon: React.ReactNode
	label: string
	value: string
	iconColor: string
	bgColor: string
}) {
	return (
		<div className='flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-lg)] bg-white border border-[var(--color-seller-border)]'>
			<div className={cn('w-8 h-8 rounded-full flex items-center justify-center', bgColor)}>
				<span className={iconColor}>{icon}</span>
			</div>
			<p className='text-sm font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)] leading-none'>{value}</p>
			<p className='text-[10px] text-[var(--color-seller-text-muted)] text-center leading-tight'>{label}</p>
		</div>
	)
}

// ── Edit Profile Modal ───────────────────────────────────────
function EditSection({
	open,
	onClose,
	profile,
}: {
	open: boolean
	onClose: () => void
	profile: SellerProfileOut
}) {
	const queryClient = useQueryClient()
	const [desc, setDesc] = useState(profile.description ?? '')
	const [phone, setPhone] = useState(profile.phone_number ?? '')
	const [openTime, setOpenTime] = useState(profile.open_time ?? '')
	const [closeTime, setCloseTime] = useState(profile.close_time ?? '')
	const [isSaving, setIsSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function handleSave() {
		setIsSaving(true)
		setError(null)
		try {
			const payload: SellerProfilePayload = {
				description: desc || null,
				phone_number: phone || null,
				open_time: openTime || null,
				close_time: closeTime || null,
			}
			await profileApi.updateSellerProfile(payload)
			await queryClient.invalidateQueries({ queryKey: ['seller', 'profile'] })
			onClose()
		} catch {
			setError('Failed to save changes. Please try again.')
		} finally {
			setIsSaving(false)
		}
	}

	if (!open) return null

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 12 }}
			className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4'
		>
			<div className='bg-white rounded-[var(--radius-2xl)] w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl'>
				<div className='sticky top-0 bg-white border-b border-[var(--color-seller-border)] px-4 py-3 flex items-center justify-between rounded-t-[var(--radius-2xl)]'>
					<h2 className='text-base font-semibold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
						Edit Store Profile
					</h2>
					<button
						onClick={onClose}
						disabled={isSaving}
						className='text-xs text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)] px-3 py-1.5 rounded-full hover:bg-[var(--color-seller-border-subtle)] transition-colors disabled:opacity-50'
					>
						Cancel
					</button>
				</div>
				<div className='p-4 space-y-4'>
					<div className='space-y-1.5'>
						<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Store Description</label>
						<textarea
							rows={4}
							value={desc}
							onChange={(e) => setDesc(e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)] resize-none'
						/>
					</div>
					<div className='space-y-1.5'>
						<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Phone</label>
						<input
							type='tel'
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
						/>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Opens at</label>
							<input
								type='time'
								value={openTime}
								onChange={(e) => setOpenTime(e.target.value)}
								className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
							/>
						</div>
						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Closes at</label>
							<input
								type='time'
								value={closeTime}
								onChange={(e) => setCloseTime(e.target.value)}
								className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
							/>
						</div>
					</div>
					{error && (
						<div className='flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-red-50 border border-red-200'>
							<AlertTriangle size={13} className='text-red-500 flex-shrink-0' />
							<p className='text-xs text-red-700'>{error}</p>
						</div>
					)}
					<button
						onClick={handleSave}
						disabled={isSaving}
						className='w-full py-2.5 bg-[var(--color-seller-accent)] text-white text-sm font-semibold rounded-full hover:bg-[var(--color-seller-accent-hover)] transition-colors disabled:opacity-60 flex items-center justify-center gap-2'
					>
						{isSaving && <Loader2 size={14} className='animate-spin' />}
						Save Changes
					</button>
				</div>
			</div>
		</motion.div>
	)
}

// ── Loading Skeleton ─────────────────────────────────────────
function ProfileSkeleton() {
	return (
		<div className='space-y-5 pb-24 md:pb-8 animate-pulse'>
			<div className='flex items-start justify-between gap-3'>
				<div>
					<div className='h-7 w-36 bg-[var(--color-seller-border)] rounded-lg' />
					<div className='h-4 w-52 bg-[var(--color-seller-border-subtle)] rounded mt-1.5' />
				</div>
				<div className='h-9 w-20 bg-[var(--color-seller-border-subtle)] rounded-full' />
			</div>
			<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
				<div className='h-28 bg-[var(--color-seller-border-subtle)]' />
				<CardContent className='px-4 pb-4 pt-3 space-y-3'>
					<div className='h-5 w-48 bg-[var(--color-seller-border)] rounded' />
					<div className='h-4 w-full bg-[var(--color-seller-border-subtle)] rounded' />
					<div className='h-4 w-3/4 bg-[var(--color-seller-border-subtle)] rounded' />
				</CardContent>
			</Card>
			<div className='grid grid-cols-3 gap-3'>
				{[0, 1, 2].map((i) => (
					<div key={i} className='h-24 rounded-[var(--radius-lg)] bg-[var(--color-seller-border-subtle)] border border-[var(--color-seller-border)]' />
				))}
			</div>
		</div>
	)
}

// ── Main Page ────────────────────────────────────────────────
export function SellerProfilePage() {
	const { user, logout } = useAuth()
	const queryClient = useQueryClient()
	const [editOpen, setEditOpen] = useState(false)

	// Hidden file inputs for image uploads
	const logoInputRef = useRef<HTMLInputElement>(null)
	const coverInputRef = useRef<HTMLInputElement>(null)
	const [logoUploading, setLogoUploading] = useState(false)
	const [coverUploading, setCoverUploading] = useState(false)

	// ── Fetch seller profile ──
	const {
		data: profile,
		isLoading: profileLoading,
		isError: profileError,
	} = useQuery({
		queryKey: ['seller', 'profile'],
		queryFn: () => profileApi.getSellerProfile().then((r) => r.data),
	})

	// ── Fetch seller analytics for stats (orders, rating, food saved, etc.) ──
	const { data: analytics } = useQuery({
		queryKey: ['seller', 'analytics'],
		queryFn: () => sellerApi.getAnalytics().then((r) => r.data),
	})

	// ── Logo upload ──
	async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setLogoUploading(true)
		try {
			const url = await uploadFile(file)
			await profileApi.updateSellerProfile({ logo_url: url })
			await queryClient.invalidateQueries({ queryKey: ['seller', 'profile'] })
		} catch {
			// silently ignore — user can retry
		} finally {
			setLogoUploading(false)
			// Reset the input so re-selecting same file works
			e.target.value = ''
		}
	}

	// ── Cover upload ──
	async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return
		setCoverUploading(true)
		try {
			const url = await uploadFile(file)
			await profileApi.updateSellerProfile({ cover_image_url: url })
			await queryClient.invalidateQueries({ queryKey: ['seller', 'profile'] })
		} catch {
			// silently ignore — user can retry
		} finally {
			setCoverUploading(false)
			e.target.value = ''
		}
	}

	// ── Loading / error states ──
	if (profileLoading) return <ProfileSkeleton />
	if (profileError || !profile) {
		return (
			<div className='flex flex-col items-center justify-center py-20 gap-3'>
				<AlertTriangle size={32} className='text-amber-500' />
				<p className='text-sm text-[var(--color-seller-text-muted)]'>Failed to load profile. Please refresh.</p>
			</div>
		)
	}

	// ── Derived display values ──
	const storeName = profile.business_name ?? user?.email ?? '—'
	const closedDays = parseClosedDays(profile.closed_days)
	const closedText = closedDays.length > 0 ? `Closed ${closedDays.join(', ')}` : 'Open every day'
	const verificationStatus = profile.is_verified ? 'verified' : profile.completion_status === 'complete' ? 'under_review' : ''
	const memberSince = profile.created_at
	const address = [profile.address_line1, profile.city].filter(Boolean).join(', ')
	const addressWithPin = [address, profile.postal_code].filter(Boolean).join(' — ')

	const totalOrders = analytics?.total_orders ?? 0
	const rating = analytics?.rating ?? 0
	const totalFoodSavedKg = analytics?.total_food_saved_kg ?? 0
	const totalCo2PreventedKg = analytics?.total_co2_prevented_kg ?? 0
	const totalMealsServed = analytics?.total_meals_served ?? 0

	return (
		<>
			{/* Hidden file inputs */}
			<input
				ref={logoInputRef}
				type='file'
				accept='image/jpeg,image/png,image/webp'
				className='hidden'
				onChange={handleLogoChange}
			/>
			<input
				ref={coverInputRef}
				type='file'
				accept='image/jpeg,image/png,image/webp'
				className='hidden'
				onChange={handleCoverChange}
			/>

			<motion.div
				variants={staggerContainer}
				initial='hidden'
				animate='visible'
				className='space-y-5 pb-24 md:pb-8'
			>
				{/* ── Header ── */}
				<motion.div variants={slideUp} className='flex items-start justify-between gap-3'>
					<div>
						<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
							Store Profile
						</h1>
						<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
							How customers see your store
						</p>
					</div>
					<button
						onClick={() => setEditOpen(true)}
						className='flex items-center gap-1.5 px-3 py-2 rounded-full border border-[var(--color-seller-border)] text-sm font-medium text-[var(--color-seller-text-secondary)] hover:border-[var(--color-seller-accent)] hover:text-[var(--color-seller-accent)] transition-colors'
					>
						<Edit3 size={14} />
						Edit
					</button>
				</motion.div>

				{/* ── Cover + Avatar ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
						{/* Cover */}
						<div className='relative h-28 overflow-hidden'>
							{profile.cover_image_url ? (
								<img src={profile.cover_image_url} alt='Cover' className='w-full h-full object-cover' />
							) : (
								<div className='w-full h-full bg-gradient-to-br from-[var(--color-seller-secondary)] to-[var(--color-seller-accent-muted)]' />
							)}
							<div className='absolute inset-0 bg-black/10' />
							<button
								onClick={() => coverInputRef.current?.click()}
								disabled={coverUploading}
								className='absolute top-3 right-3 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm disabled:opacity-60'
							>
								{coverUploading
									? <Loader2 size={13} className='text-[var(--color-seller-text-secondary)] animate-spin' />
									: <Camera size={13} className='text-[var(--color-seller-text-secondary)]' />
								}
							</button>
						</div>

						<CardContent className='px-4 pb-4'>
							<div className='flex items-end justify-between -mt-7 mb-3'>
								<div className='relative'>
									<Avatar className='w-14 h-14 border-2 border-white shadow-md'>
										{profile.logo_url && <AvatarImage src={profile.logo_url} alt={storeName} />}
										<AvatarFallback className='bg-[var(--color-seller-accent-muted)] text-[var(--color-seller-accent)] text-lg font-bold'>
											{storeName.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<button
										onClick={() => logoInputRef.current?.click()}
										disabled={logoUploading}
										className='absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-seller-accent)] rounded-full flex items-center justify-center shadow-sm disabled:opacity-60'
									>
										{logoUploading
											? <Loader2 size={9} className='text-white animate-spin' />
											: <Camera size={10} className='text-white' />
										}
									</button>
								</div>
								<VerificationBadge status={verificationStatus} />
							</div>

							<div className='flex items-start justify-between gap-2 flex-wrap'>
								<div>
									<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
										{storeName}
									</h2>
									<p className='text-xs text-[var(--color-seller-text-muted)]'>
										{profile.business_type ? (CATEGORY_LABELS[profile.business_type] ?? profile.business_type) : '—'}
										{memberSince && ` · Member since ${formatMemberSince(memberSince)}`}
									</p>
								</div>
								{rating > 0 && (
									<div className='flex items-center gap-1'>
										<Star size={14} className='text-amber-400 fill-amber-400' />
										<span className='text-sm font-bold text-[var(--color-seller-text-primary)]'>{rating.toFixed(1)}</span>
										{analytics && (
											<span className='text-xs text-[var(--color-seller-text-muted)]'>({analytics.review_count})</span>
										)}
									</div>
								)}
							</div>

							{profile.description && (
								<p className='text-sm text-[var(--color-seller-text-secondary)] mt-2 leading-relaxed'>
									{profile.description}
								</p>
							)}

							{/* Public listing link */}
							<button className='mt-3 flex items-center gap-1 text-xs text-[var(--color-seller-accent)] font-medium hover:underline'>
								<ExternalLink size={12} />
								View public store listing
							</button>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Performance stats ── */}
				<motion.div variants={staggerContainer} className='grid grid-cols-3 gap-3'>
					<motion.div variants={fadeIn}>
						<StatPill
							icon={<ShoppingBag size={15} />}
							label='Orders Completed'
							value={totalOrders > 0 ? formatCompact(totalOrders) : '—'}
							iconColor='text-[var(--color-seller-accent)]'
							bgColor='bg-[var(--color-seller-accent-muted)]'
						/>
					</motion.div>
					<motion.div variants={fadeIn}>
						<StatPill
							icon={<Star size={15} />}
							label='Avg Rating'
							value={rating > 0 ? rating.toFixed(1) : '—'}
							iconColor='text-amber-500'
							bgColor='bg-amber-50'
						/>
					</motion.div>
					<motion.div variants={fadeIn}>
						<StatPill
							icon={<Leaf size={15} />}
							label='Food Saved (kg)'
							value={totalFoodSavedKg > 0 ? formatCompact(totalFoodSavedKg) : '—'}
							iconColor='text-[#2d8a4e]'
							bgColor='bg-[var(--color-seller-eco-muted)]'
						/>
					</motion.div>
				</motion.div>

				{/* ── Contact & Location ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
						<CardContent className='p-4'>
							<h3 className='text-sm font-semibold text-[var(--color-seller-text-primary)] mb-1'>
								Contact & Location
							</h3>
							<Separator className='mb-2 bg-[var(--color-seller-border-subtle)]' />
							<InfoRow icon={<Mail size={15} />} label='Email' value={user?.email ?? '—'} />
							<Separator className='bg-[var(--color-seller-border-subtle)]' />
							<InfoRow icon={<Phone size={15} />} label='Phone' value={profile.phone_number ?? '—'} />
							<Separator className='bg-[var(--color-seller-border-subtle)]' />
							<InfoRow icon={<MapPin size={15} />} label='Address' value={addressWithPin || '—'} />
							{(profile.open_time || profile.close_time) && (
								<>
									<Separator className='bg-[var(--color-seller-border-subtle)]' />
									<InfoRow
										icon={<Clock size={15} />}
										label='Operating Hours'
										value={`${profile.open_time ?? '?'} – ${profile.close_time ?? '?'} · ${closedText}`}
									/>
								</>
							)}
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Compliance ── */}
				<motion.div variants={slideUp}>
					<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
						<CardContent className='p-4'>
							<h3 className='text-sm font-semibold text-[var(--color-seller-text-primary)] mb-1'>
								Compliance
							</h3>
							<Separator className='mb-2 bg-[var(--color-seller-border-subtle)]' />
							<div className='space-y-0 divide-y divide-[var(--color-seller-border-subtle)]'>
							{[
								{
									label: 'FSSAI License',
									value: profile.license_number ?? '—',
									verified: !!profile.license_number,
								},
								{
									label: 'GST Number',
									value: profile.gst_number ?? 'Not provided',
									verified: !!profile.gst_number,
								},
								{
									label: 'Bank Account',
									value: profile.bank_account ? 'Linked' : 'Not linked',
									verified: !!profile.bank_account,
								},
							].map((item) => (
								<div key={item.label} className='flex items-center justify-between py-3'>
									<div>
										<p className='text-[11px] text-[var(--color-seller-text-muted)]'>{item.label}</p>
										<p className='text-sm font-medium text-[var(--color-seller-text-primary)] mt-0.5'>{item.value}</p>
									</div>
									{item.verified ? (
										<CheckCircle2 size={16} className='text-[#2d8a4e]' />
									) : (
										<button className='text-xs font-semibold text-[var(--color-seller-accent)] flex items-center gap-1 hover:underline'>
											Add <ChevronRight size={13} />
										</button>
									)}
								</div>
							))}

							{/* ── FSSAI Certificate document ── */}
							<div className='flex items-center justify-between py-3'>
								<div className='flex items-center gap-2.5'>
									<FileText size={15} className='text-[var(--color-seller-text-muted)] flex-shrink-0' />
									<div>
										<p className='text-[11px] text-[var(--color-seller-text-muted)]'>FSSAI Certificate</p>
										{profile.fssai_certificate_url ? (
											<a
												href={profile.fssai_certificate_url}
												target='_blank'
												rel='noopener noreferrer'
												className='text-xs font-medium text-[var(--color-seller-accent)] hover:underline mt-0.5 flex items-center gap-1'
											>
												View document <ExternalLink size={11} />
											</a>
										) : (
											<p className='text-sm font-medium text-[var(--color-seller-text-primary)] mt-0.5'>Not uploaded</p>
										)}
									</div>
								</div>
								{profile.fssai_certificate_url ? (
									<CheckCircle2 size={16} className='text-[#2d8a4e]' />
								) : (
									<button className='text-xs font-semibold text-[var(--color-seller-accent)] flex items-center gap-1 hover:underline'>
										Add <ChevronRight size={13} />
									</button>
								)}
							</div>

							{/* ── Bank Statement document ── */}
							<div className='flex items-center justify-between py-3'>
								<div className='flex items-center gap-2.5'>
									<FileText size={15} className='text-[var(--color-seller-text-muted)] flex-shrink-0' />
									<div>
										<p className='text-[11px] text-[var(--color-seller-text-muted)]'>Bank Statement / Cheque</p>
										{profile.bank_statement_url ? (
											<a
												href={profile.bank_statement_url}
												target='_blank'
												rel='noopener noreferrer'
												className='text-xs font-medium text-[var(--color-seller-accent)] hover:underline mt-0.5 flex items-center gap-1'
											>
												View document <ExternalLink size={11} />
											</a>
										) : (
											<p className='text-sm font-medium text-[var(--color-seller-text-primary)] mt-0.5'>Not uploaded</p>
										)}
									</div>
								</div>
								{profile.bank_statement_url ? (
									<CheckCircle2 size={16} className='text-[#2d8a4e]' />
								) : (
									<button className='text-xs font-semibold text-[var(--color-seller-accent)] flex items-center gap-1 hover:underline'>
										Add <ChevronRight size={13} />
									</button>
								)}
							</div>
							</div>
						</CardContent>
					</Card>
				</motion.div>

				{/* ── Sustainability ── */}
				<motion.div variants={slideUp}>
					<Card className='border-0 shadow-none overflow-hidden bg-gradient-to-br from-[#1a3a28] to-[#2d5a3e]'>
						<CardContent className='p-4'>
							<div className='flex items-center gap-2 mb-3'>
								<Leaf size={15} className='text-[#7ecfa0]' />
								<h3 className='text-sm font-semibold text-white'>Your Impact</h3>
							</div>
							<div className='grid grid-cols-3 gap-2'>
								{[
									{
										icon: <Leaf size={16} />,
										value: totalFoodSavedKg > 0 ? `${formatCompact(totalFoodSavedKg)} kg` : '—',
										label: 'Food Saved',
										color: 'text-[#7ecfa0]',
									},
									{
										icon: <Wind size={16} />,
										value: totalCo2PreventedKg > 0 ? `${formatCompact(totalCo2PreventedKg)} kg` : '—',
										label: 'CO₂ Prevented',
										color: 'text-sky-300',
									},
									{
										icon: <UtensilsCrossed size={16} />,
										value: totalMealsServed > 0 ? formatCompact(totalMealsServed) : '—',
										label: 'Meals Served',
										color: 'text-amber-300',
									},
								].map((stat) => (
									<div key={stat.label} className='bg-white/8 rounded-[var(--radius-lg)] p-2.5 text-center'>
										<span className={stat.color}>{stat.icon}</span>
										<p className='text-sm font-bold text-white mt-1 leading-none'>{stat.value}</p>
										<p className='text-[9px] text-white/60 mt-0.5 leading-tight'>{stat.label}</p>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
			</motion.div>

			{/* ── Sign Out ── */}
			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
					<CardContent className='p-0'>
						<div className='px-4 py-3 border-b border-[var(--color-seller-border-subtle)]'>
							<h3 className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>Session</h3>
						</div>
						<div className='px-4 py-4 flex items-start justify-between gap-4'>
							<div className='flex-1 min-w-0'>
								<p className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Sign Out</p>
								<p className='text-xs text-[var(--color-seller-text-muted)] mt-0.5 leading-relaxed'>
									Sign out of your seller account on this device.
								</p>
							</div>
							<button
								type='button'
								onClick={() => logout()}
								className='flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-seller-accent)] text-white text-xs font-semibold hover:bg-[var(--color-seller-accent-hover)] active:scale-95 transition-all flex-shrink-0'
							>
								<LogOut size={13} />
								Sign Out
							</button>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</motion.div>

		{/* ── Edit Sheet ── */}
		<EditSection open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
		</>
	)
}
