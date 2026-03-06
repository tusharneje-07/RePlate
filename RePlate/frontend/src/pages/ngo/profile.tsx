import { useState } from 'react'
import { motion } from 'motion/react'
import {
	Building2,
	MapPin,
	Phone,
	Mail,
	Clock,
	Star,
	Shield,
	Truck,
	Package,
	Edit2,
	CheckCircle2,
	ChevronRight,
	LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { useNGOStore } from '@/stores/ngo-store'
import { useAuth } from '@/hooks/useAuth'

const CATEGORY_LABELS: Record<string, string> = {
	food_bank: 'Food Bank',
	shelter: 'Shelter / Homeless',
	orphanage: 'Orphanage',
	old_age_home: 'Old Age Home',
	community_kitchen: 'Community Kitchen',
	school: 'School / Education',
	other: 'Other',
}

const VEHICLE_LABELS: Record<string, string> = {
	bicycle: 'Bicycle',
	motorcycle: 'Motorcycle',
	car: 'Car',
	van: 'Van / Tempo',
	truck: 'Truck',
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
	return (
		<div className='flex items-start gap-3 py-3 border-b border-[var(--color-ngo-border-subtle)] last:border-0'>
			<div className='w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-ngo-accent-light)] flex items-center justify-center flex-shrink-0 text-[var(--color-ngo-accent)]'>
				{icon}
			</div>
			<div className='flex-1'>
				<p className='text-xs text-[var(--color-ngo-text-muted)] font-medium'>{label}</p>
				<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)] mt-0.5'>{value}</p>
			</div>
		</div>
	)
}

export function NGOProfilePage() {
	const { profile } = useNGOStore()
	const { logout } = useAuth()
	const [activeTab, setActiveTab] = useState<'overview' | 'operations' | 'documents'>('overview')

	if (!profile) {
		return (
			<div className='flex items-center justify-center h-full'>
				<p className='text-[var(--color-ngo-text-muted)]'>Profile not loaded.</p>
			</div>
		)
	}

	const memberYear = new Date(profile.memberSince).getFullYear()

	return (
		<div className='flex flex-col h-full bg-[var(--color-ngo-bg)]'>
			{/* ── Cover image ── */}
			<div className='relative h-36 overflow-hidden flex-shrink-0'>
				<img
					src={profile.coverImage}
					alt='cover'
					className='w-full h-full object-cover'
				/>
				<div className='absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50' />
			</div>

			{/* ── Hero: avatar + name + stats + edit ── */}
			{/* pt-14 = half the avatar (80px / 2 = 40px = ~10) + a bit of breathing room */}
			<div className='bg-white border-b border-[var(--color-ngo-border)] px-4 pb-4 flex-shrink-0 relative'>
				{/* Avatar — positioned to straddle the cover/white boundary */}
				<div className='absolute -top-10 left-4'>
					<Avatar className='w-20 h-20 border-[3px] border-white shadow-xl ring-2 ring-[var(--color-ngo-accent)]/20'>
						<AvatarImage src={profile.logo} alt={profile.organizationName} />
						<AvatarFallback className='bg-[var(--color-ngo-accent)] text-white text-2xl font-bold'>
							{profile.organizationName[0]}
						</AvatarFallback>
					</Avatar>
				</div>

				{/* Name + badges — push down by avatar overlap (40px = pt-12) */}
				<div className='pt-12 pb-3'>
					<div className='flex items-center gap-1.5 flex-wrap'>
						<h1 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
							{profile.organizationName}
						</h1>
						{profile.verificationStatus === 'verified' && (
							<CheckCircle2 size={16} className='text-[var(--color-ngo-accent)] flex-shrink-0' />
						)}
					</div>
					<div className='flex items-center gap-2 flex-wrap mt-0.5'>
						<Badge className='bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)] border-none text-[10px] font-bold px-2 hover:bg-[var(--color-ngo-accent-light)]'>
							{CATEGORY_LABELS[profile.category] || profile.category}
						</Badge>
						<span className='text-xs text-[var(--color-ngo-text-muted)]'>
							Member since {memberYear}
						</span>
					</div>
				</div>

				{/* Stats row */}
				<div className='grid grid-cols-3 divide-x divide-[var(--color-ngo-border)] border border-[var(--color-ngo-border)] rounded-[var(--radius-xl)] overflow-hidden mb-3'>
					{[
						{ label: 'Pickups', value: profile.totalPickupsCompleted.toLocaleString() },
						{ label: 'Meals', value: `${(profile.totalMealsServed / 1000).toFixed(0)}K` },
						{ label: 'Rating', value: String(profile.rating) },
					].map((s) => (
						<div key={s.label} className='text-center py-3 bg-white'>
							<p className='text-base font-bold font-[var(--font-display)] text-[var(--color-ngo-accent)]'>
								{s.value}
							</p>
							<p className='text-[10px] text-[var(--color-ngo-text-muted)] font-medium mt-0.5'>{s.label}</p>
						</div>
					))}
				</div>

				<Button
					variant='outline'
					size='sm'
					className='w-full h-9 border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] text-xs font-semibold gap-1.5 rounded-full hover:bg-[var(--color-ngo-surface-elevated)]'
				>
					<Edit2 size={12} /> Edit Profile
				</Button>
			</div>

			{/* ── Tabs ── */}
			<div className='bg-white border-b border-[var(--color-ngo-border)] px-4'>
				<div className='flex'>
					{(['overview', 'operations', 'documents'] as const).map((tab) => (
						<button
							key={tab}
							onClick={() => setActiveTab(tab)}
							className={`flex-1 py-3 text-xs font-bold capitalize transition-colors border-b-2 ${
								activeTab === tab
									? 'border-[var(--color-ngo-accent)] text-[var(--color-ngo-accent)]'
									: 'border-transparent text-[var(--color-ngo-text-muted)] hover:text-[var(--color-ngo-text-secondary)]'
							}`}
						>
							{tab}
						</button>
					))}
				</div>
			</div>

			{/* ── Tab Content ── */}
			<div className='flex-1 overflow-y-auto p-4 md:px-6'>
				<div className='max-w-2xl mx-auto space-y-4 pb-24'>
					<motion.div
						key={activeTab}
						variants={staggerContainer}
						initial='hidden'
						animate='visible'
						className='space-y-4'
					>
						{activeTab === 'overview' && (
							<>
								{/* About */}
								<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
									<h3 className='text-sm font-bold text-[var(--color-ngo-text-primary)] mb-2'>About</h3>
									<p className='text-sm text-[var(--color-ngo-text-secondary)] leading-relaxed'>
										{profile.description}
									</p>
								</motion.div>

								{/* Contact */}
								<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
									<h3 className='text-sm font-bold text-[var(--color-ngo-text-primary)] mb-1'>Contact</h3>
									<InfoRow label='Contact Person' value={profile.contactPerson} icon={<Building2 size={14} />} />
									<InfoRow label='Email' value={profile.email} icon={<Mail size={14} />} />
									<InfoRow label='Phone' value={profile.phone} icon={<Phone size={14} />} />
									<InfoRow
										label='Address'
										value={`${profile.address}, ${profile.city} — ${profile.pincode}`}
										icon={<MapPin size={14} />}
									/>
								</motion.div>

								{/* Service Areas */}
								<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
									<h3 className='text-sm font-bold text-[var(--color-ngo-text-primary)] mb-3'>Service Areas</h3>
									<div className='flex flex-wrap gap-2'>
										{profile.serviceAreas.map((area) => (
											<Badge
											key={area}
											className='bg-[var(--color-ngo-eco-muted)] text-[var(--color-ngo-text-secondary)] border-[var(--color-ngo-border)] text-xs font-medium hover:bg-[var(--color-ngo-eco-muted)] flex items-center gap-1'
										>
											<MapPin size={11} />
											{area}
										</Badge>
										))}
									</div>
								</motion.div>
							</>
						)}

						{activeTab === 'operations' && (
							<>
								<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
									<h3 className='text-sm font-bold text-[var(--color-ngo-text-primary)] mb-1'>Logistics</h3>
									<InfoRow
										label='Operating Hours'
										value={`${profile.operatingHours.open} – ${profile.operatingHours.close}`}
										icon={<Clock size={14} />}
									/>
									<InfoRow
										label='Vehicle Type'
										value={VEHICLE_LABELS[profile.vehicleType] || profile.vehicleType}
										icon={<Truck size={14} />}
									/>
									<InfoRow
										label='Daily Pickup Capacity'
										value={`${profile.pickupCapacityKg} kg`}
										icon={<Package size={14} />}
									/>
								</motion.div>

								<motion.div variants={slideUp} className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
									<h3 className='text-sm font-bold text-[var(--color-ngo-text-primary)] mb-3'>
										Closed Days
									</h3>
									{profile.closedDays.length === 0 ? (
										<p className='text-sm text-[var(--color-ngo-text-muted)]'>
											Operational every day — no closed days set.
										</p>
									) : (
										<div className='flex flex-wrap gap-2'>
											{profile.closedDays.map((d) => (
												<Badge key={d} className='bg-red-50 text-red-600 border-red-200 text-xs hover:bg-red-50'>
													{d}
												</Badge>
											))}
										</div>
									)}
								</motion.div>
							</>
						)}

						{activeTab === 'documents' && (
							<>
								<motion.div variants={fadeIn}>
									<div className='rounded-[var(--radius-xl)] bg-[var(--color-ngo-accent-light)] border border-[var(--color-ngo-accent)]/20 p-4 flex items-center gap-3 mb-4'>
										<CheckCircle2 size={20} className='text-[var(--color-ngo-accent)] flex-shrink-0' />
										<div>
											<p className='text-sm font-bold text-[var(--color-ngo-accent)]'>Verified NGO</p>
											<p className='text-xs text-[var(--color-ngo-text-muted)]'>
												All submitted documents have been reviewed and approved.
											</p>
										</div>
									</div>
								</motion.div>

								{[
									{ label: 'NGO Registration Number', value: profile.registrationNumber },
									{ label: 'PAN Number', value: profile.panNumber },
									{ label: 'Registration Document', value: profile.ngoRegistrationDoc || '—' },
								].map((doc) => (
									<motion.div variants={slideUp} key={doc.label}>
										<div className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4 flex items-center justify-between gap-3'>
											<div className='flex items-center gap-3'>
												<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-ngo-accent-light)] flex items-center justify-center flex-shrink-0'>
													<Shield size={14} className='text-[var(--color-ngo-accent)]' />
												</div>
												<div>
													<p className='text-xs text-[var(--color-ngo-text-muted)]'>{doc.label}</p>
													<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)] font-mono'>
														{doc.value}
													</p>
												</div>
											</div>
											<Badge className='bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)] border-none text-[9px] font-bold hover:bg-[var(--color-ngo-accent-light)]'>
												VERIFIED
											</Badge>
										</div>
									</motion.div>
								))}

								<motion.div variants={slideUp}>
									<div className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4'>
										<div className='flex items-center gap-3'>
											<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-ngo-accent-light)] flex items-center justify-center flex-shrink-0'>
												<Star size={14} className='text-[var(--color-ngo-accent)]' />
											</div>
											<div className='flex-1'>
												<p className='text-xs text-[var(--color-ngo-text-muted)]'>Donor Rating</p>
												<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>
													{profile.rating} / 5.0 ({profile.reviewCount} reviews)
												</p>
											</div>
										</div>
									</div>
								</motion.div>
							</>
						)}
					</motion.div>

					<motion.div variants={slideUp}>
						<div className='bg-white rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] p-4 flex items-start justify-between gap-3'>
							<div>
								<p className='text-sm font-bold text-[var(--color-ngo-text-primary)]'>Sign Out</p>
								<p className='text-xs text-[var(--color-ngo-text-muted)] mt-1'>Sign out of this NGO account on this device.</p>
							</div>
							<Button
								onClick={() => logout()}
								className='h-8 px-3 text-xs rounded-full bg-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent)]/90 text-white'
							>
								<LogOut size={12} className='mr-1' />
								Sign Out
							</Button>
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	)
}
