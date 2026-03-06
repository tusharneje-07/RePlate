import { useState } from 'react'
import { motion } from 'motion/react'
import {
	Store,
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
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'
import { mockSellerProfile } from '@/data/seller-mock'
import { cn } from '@/lib/utils'

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

// ── Edit Profile Sheet (inline inline form) ──────────────────
function EditSection({
	open,
	onClose,
	profile,
}: {
	open: boolean
	onClose: () => void
	profile: typeof mockSellerProfile
}) {
	const [desc, setDesc] = useState(profile.description)

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
						className='text-xs text-[var(--color-seller-text-muted)] hover:text-[var(--color-seller-text-primary)] px-3 py-1.5 rounded-full hover:bg-[var(--color-seller-border-subtle)] transition-colors'
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
							defaultValue={profile.phone}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
						/>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Opens at</label>
							<input
								type='time'
								defaultValue={profile.openTime}
								className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
							/>
						</div>
						<div className='space-y-1.5'>
							<label className='text-sm font-medium text-[var(--color-seller-text-primary)]'>Closes at</label>
							<input
								type='time'
								defaultValue={profile.closeTime}
								className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
							/>
						</div>
					</div>
					<button
						onClick={onClose}
						className='w-full py-2.5 bg-[var(--color-seller-accent)] text-white text-sm font-semibold rounded-full hover:bg-[var(--color-seller-accent-hover)] transition-colors'
					>
						Save Changes
					</button>
				</div>
			</div>
		</motion.div>
	)
}

// ── Main Page ────────────────────────────────────────────────
export function SellerProfilePage() {
	const profile = mockSellerProfile
	const [editOpen, setEditOpen] = useState(false)

	const closedText =
		profile.closedDays.length > 0
			? `Closed ${profile.closedDays.join(', ')}`
			: 'Open every day'

	return (
		<>
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
							{profile.coverImage ? (
								<img src={profile.coverImage} alt='Cover' className='w-full h-full object-cover' />
							) : (
								<div className='w-full h-full bg-gradient-to-br from-[var(--color-seller-secondary)] to-[var(--color-seller-accent-muted)]' />
							)}
							<div className='absolute inset-0 bg-black/10' />
							<button className='absolute top-3 right-3 w-7 h-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm'>
								<Camera size={13} className='text-[var(--color-seller-text-secondary)]' />
							</button>
						</div>

						<CardContent className='px-4 pb-4'>
							<div className='flex items-end justify-between -mt-7 mb-3'>
								<div className='relative'>
									<Avatar className='w-14 h-14 border-2 border-white shadow-md'>
										{profile.logo && <AvatarImage src={profile.logo} alt={profile.name} />}
										<AvatarFallback className='bg-[var(--color-seller-accent-muted)] text-[var(--color-seller-accent)] text-lg font-bold'>
											{profile.name.slice(0, 2).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<button className='absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-seller-accent)] rounded-full flex items-center justify-center shadow-sm'>
										<Camera size={10} className='text-white' />
									</button>
								</div>
								<VerificationBadge status={profile.verificationStatus} />
							</div>

							<div className='flex items-start justify-between gap-2 flex-wrap'>
								<div>
									<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)]'>
										{profile.name}
									</h2>
									<p className='text-xs text-[var(--color-seller-text-muted)]'>
										{CATEGORY_LABELS[profile.category] ?? profile.category} · Member since{' '}
										{formatMemberSince(profile.memberSince)}
									</p>
								</div>
								<div className='flex items-center gap-1'>
									<Star size={14} className='text-amber-400 fill-amber-400' />
									<span className='text-sm font-bold text-[var(--color-seller-text-primary)]'>{profile.rating}</span>
									<span className='text-xs text-[var(--color-seller-text-muted)]'>({profile.reviewCount})</span>
								</div>
							</div>

							<p className='text-sm text-[var(--color-seller-text-secondary)] mt-2 leading-relaxed'>
								{profile.description}
							</p>

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
							value={formatCompact(profile.totalOrdersCompleted)}
							iconColor='text-[var(--color-seller-accent)]'
							bgColor='bg-[var(--color-seller-accent-muted)]'
						/>
					</motion.div>
					<motion.div variants={fadeIn}>
						<StatPill
							icon={<Star size={15} />}
							label='Avg Rating'
							value={String(profile.rating)}
							iconColor='text-amber-500'
							bgColor='bg-amber-50'
						/>
					</motion.div>
					<motion.div variants={fadeIn}>
						<StatPill
							icon={<Leaf size={15} />}
							label='Food Saved (kg)'
							value={formatCompact(profile.totalFoodSavedKg)}
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
							<InfoRow icon={<Mail size={15} />} label='Email' value={profile.email} />
							<Separator className='bg-[var(--color-seller-border-subtle)]' />
							<InfoRow icon={<Phone size={15} />} label='Phone' value={profile.phone} />
							<Separator className='bg-[var(--color-seller-border-subtle)]' />
							<InfoRow icon={<MapPin size={15} />} label='Address' value={`${profile.address}, ${profile.city} — ${profile.pincode}`} />
							<Separator className='bg-[var(--color-seller-border-subtle)]' />
							<InfoRow
								icon={<Clock size={15} />}
								label='Operating Hours'
								value={`${profile.openTime} – ${profile.closeTime} · ${closedText}`}
							/>
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
										value: profile.fssaiLicense ?? '—',
										verified: !!profile.fssaiLicense,
									},
									{
										label: 'GST Number',
										value: profile.gstNumber ?? 'Not provided',
										verified: !!profile.gstNumber,
									},
									{
										label: 'Bank Account',
										value: profile.bankAccountLinked ? 'Linked ✓' : 'Not linked',
										verified: profile.bankAccountLinked,
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
									{ icon: <Leaf size={16} />, value: `${formatCompact(profile.totalFoodSavedKg)} kg`, label: 'Food Saved', color: 'text-[#7ecfa0]' },
									{ icon: <Wind size={16} />, value: `${formatCompact(profile.totalCo2PreventedKg)} kg`, label: 'CO₂ Prevented', color: 'text-sky-300' },
									{ icon: <UtensilsCrossed size={16} />, value: formatCompact(profile.totalMealsServed), label: 'Meals Served', color: 'text-amber-300' },
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
			</motion.div>

			{/* ── Edit Sheet ── */}
			<EditSection open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
		</>
	)
}
