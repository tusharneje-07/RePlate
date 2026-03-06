import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Mail, Phone, MapPin, Star, Package, Leaf, TreePine, Sprout, Flame,
	ChevronRight, Edit3, Camera, Award, Loader2, Trash2, AlertTriangle, X,
	type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { staggerContainer, slideUp } from '@/lib/motion'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { profileApi, impactApi, ordersApi, userApi, type ConsumerProfilePayload } from '@/lib/api'
import { mapImpactStatsOut } from '@/lib/mappers'

const levelConfig: Record<string, { label: string; icon: LucideIcon; color: 'muted' | 'eco' }> = {
	seedling: { label: 'Seedling', icon: Sprout, color: 'muted' as const },
	sprout: { label: 'Sprout', icon: Sprout, color: 'eco' as const },
	sapling: { label: 'Sapling', icon: Leaf, color: 'eco' as const },
	tree: { label: 'Tree', icon: TreePine, color: 'eco' as const },
	forest: { label: 'Forest', icon: TreePine, color: 'eco' as const },
}

export function ProfilePage() {
	const { user, deleteAccount } = useAuth()

	// Real impact data
	const { data: impactOut } = useQuery({
		queryKey: ['impact', 'me'],
		queryFn: () => impactApi.getMyImpact().then((r) => r.data),
	})
	const impact = impactOut ? mapImpactStatsOut(impactOut) : null

	// Real orders count
	const { data: orders } = useQuery({
		queryKey: ['orders'],
		queryFn: () => ordersApi.list().then((r) => r.data),
	})

	// Profile state loaded from backend
	const [profile, setProfile] = useState<ConsumerProfilePayload | null>(null)
	const [profileLoading, setProfileLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)

	// Edit state — initialised from real data once loaded
	const [isEditing, setIsEditing] = useState(false)
	const [name, setName] = useState('')
	const [phone, setPhone] = useState('')

	// Delete account dialog state
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deleteConfirmText, setDeleteConfirmText] = useState('')
	const [isDeleting, setIsDeleting] = useState(false)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	// Load profile from backend on mount
	useEffect(() => {
		profileApi
			.getConsumerProfile()
			.then(({ data }) => {
				setProfile(data)
				setPhone(data.phone_number ?? '')
			})
			.catch(() => {
				// profile fetch failed — will show empty fields
			})
			.finally(() => setProfileLoading(false))
	}, [])

	// Keep name in sync with auth user
	useEffect(() => {
		if (user) {
			setName([user.firstName, user.lastName].filter(Boolean).join(' ') || user.email)
		}
	}, [user])

	async function handleSave() {
		setIsSaving(true)
		try {
			const parts = name.trim().split(/\s+/)
			const firstName = parts[0] ?? ''
			const lastName = parts.slice(1).join(' ') || null
			await Promise.all([
				profileApi.updateConsumerProfile({ phone_number: phone || null }),
				userApi.updateMe({ first_name: firstName || null, last_name: lastName }),
			])
			const { data } = await profileApi.getConsumerProfile()
			setProfile(data)
			setIsEditing(false)
		} catch {
			// TODO: show toast error
		} finally {
			setIsSaving(false)
		}
	}

	async function handleDeleteAccount() {
		if (deleteConfirmText !== 'DELETE') return
		setIsDeleting(true)
		setDeleteError(null)
		try {
			await deleteAccount()
			// deleteAccount() navigates away — this line won't be reached
		} catch {
			setDeleteError('Failed to delete account. Please try again.')
			setIsDeleting(false)
		}
	}

	function openDeleteDialog() {
		setDeleteConfirmText('')
		setDeleteError(null)
		setShowDeleteDialog(true)
	}

	const lc = levelConfig[impact?.level ?? 'seedling']

	const quickLinks = [
		{ icon: Package, label: 'My Orders', to: '/consumer/orders', count: orders?.length ?? null },
		{ icon: Leaf, label: 'My Impact', to: '/consumer/impact', count: null },
		{ icon: Star, label: 'Favorites', to: '/consumer/favorites', count: null },
	]

	const displayEmail = user?.email ?? ''
	const displayCity = profile?.city ?? ''
	const displayAddress = profile?.address_line1 ?? ''
	const displayLocation =
		displayAddress && displayCity
			? `${displayAddress}, ${displayCity}`
			: displayCity || displayAddress || '—'

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='space-y-5 pb-6'
		>
			{/* Header */}
			<motion.div variants={slideUp} className='flex items-center justify-between'>
				<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					Profile
				</h1>
				<Button
					variant='ghost'
					size='icon-sm'
					onClick={() => setIsEditing(!isEditing)}
					disabled={profileLoading}
				>
					<Edit3 size={16} />
				</Button>
			</motion.div>

			{/* Avatar + name card */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5'
			>
				<div className='flex items-center gap-4'>
					<div className='relative flex-shrink-0'>
						<div className='w-20 h-20 rounded-full overflow-hidden bg-[var(--color-brand-secondary)]'>
							{user?.profilePictureUrl ? (
								<img src={user.profilePictureUrl} alt={name} className='w-full h-full object-cover' />
							) : (
								<div className='w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--color-text-primary)]'>
									{name[0] ?? '?'}
								</div>
							)}
						</div>
						<button
							type='button'
							className='absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--color-brand-accent)] flex items-center justify-center shadow-sm'
						>
							<Camera size={11} className='text-white' />
						</button>
					</div>

					<div className='flex-1 min-w-0'>
						{isEditing ? (
							<input
								type='text'
								value={name}
								onChange={(e) => setName(e.target.value)}
								className='w-full text-base font-bold bg-transparent border-b border-[var(--color-brand-accent)] text-[var(--color-text-primary)] focus:outline-none pb-0.5'
							/>
						) : (
							<h2 className='text-base font-bold text-[var(--color-text-primary)]'>{name || '—'}</h2>
						)}
						<p className='text-xs text-[var(--color-text-muted)] mt-0.5'>{displayEmail}</p>
						<div className='flex items-center gap-2 mt-1.5'>
							<Badge variant='eco' className='text-[10px] gap-1'>
								<lc.icon size={10} /> {lc.label}
							</Badge>
							{profile?.dietary_preferences && (
								<span className='text-[10px] text-[var(--color-text-muted)]'>
									{profile.dietary_preferences}
								</span>
							)}
						</div>
					</div>
				</div>

				{isEditing && (
					<motion.div
						initial={{ opacity: 0, y: -6 }}
						animate={{ opacity: 1, y: 0 }}
						className='mt-4 space-y-3'
					>
						<div>
							<label className='text-xs font-medium text-[var(--color-text-secondary)]'>Phone</label>
							<input
								type='tel'
								value={phone}
								onChange={(e) => setPhone(e.target.value)}
								className='w-full mt-1 h-9 px-3 text-sm bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:border-[var(--color-brand-accent)] transition-colors'
							/>
						</div>
						<div className='flex gap-2'>
							<Button size='sm' onClick={handleSave} disabled={isSaving} className='flex-1'>
								{isSaving ? <Loader2 size={14} className='animate-spin mr-1' /> : null}
								Save Changes
							</Button>
							<Button size='sm' variant='outline' onClick={() => setIsEditing(false)} disabled={isSaving} className='flex-1'>
								Cancel
							</Button>
						</div>
					</motion.div>
				)}
			</motion.div>

			{/* Eco level progress */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-eco-muted)] rounded-[var(--radius-xl)] border border-[var(--color-eco-light)] p-4'
			>
				<div className='flex items-center justify-between mb-2'>
					<div className='flex items-center gap-2'>
						<Award size={15} className='text-[var(--color-eco)]' />
						<p className='text-sm font-semibold text-[var(--color-eco)]'><lc.icon size={14} className='inline mr-1' />{lc.label}</p>
					</div>
					<Link to='/consumer/impact' className='text-xs text-[var(--color-eco)] font-medium hover:underline'>
						View Impact
					</Link>
				</div>
				<Progress value={impact?.nextLevelProgress ?? 0} className='h-2 bg-white' />
				<p className='text-xs text-[var(--color-text-muted)] mt-1.5'>
					{impact?.nextLevelProgress ?? 0}% to next level · {impact?.streak ?? 0} day streak <Flame size={11} className='inline text-orange-500' />
				</p>
			</motion.div>

			{/* Stats row */}
			<motion.div variants={slideUp} className='grid grid-cols-3 gap-3'>
				{[
					{ label: 'Orders', value: impact?.totalOrders ?? '—' },
					{ label: 'CO₂ Saved', value: impact ? `${impact.totalCo2Saved}kg` : '—' },
					{ label: 'Saved', value: impact ? formatCurrency(impact.totalMoneySaved) : '—' },
				].map((stat) => (
					<div
						key={stat.label}
						className='bg-[var(--color-surface-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 text-center shadow-[var(--shadow-card)]'
					>
						<p className='text-lg font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>{stat.value}</p>
						<p className='text-[10px] text-[var(--color-text-muted)] mt-0.5'>{stat.label}</p>
					</div>
				))}
			</motion.div>

			{/* Info details */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				<div className='px-4 py-3 border-b border-[var(--color-border-subtle)]'>
					<p className='text-sm font-semibold text-[var(--color-text-primary)]'>Account Details</p>
				</div>
				{profileLoading ? (
					<div className='flex items-center justify-center py-8'>
						<Loader2 size={20} className='animate-spin text-[var(--color-text-muted)]' />
					</div>
				) : (
					[
						{ icon: Mail, label: 'Email', value: displayEmail },
						{ icon: Phone, label: 'Phone', value: phone || '—' },
						{ icon: MapPin, label: 'Location', value: displayLocation },
					].map((item, i, arr) => (
						<div key={item.label}>
							<div className='flex items-center gap-3 px-4 py-3.5'>
								<item.icon size={15} className='text-[var(--color-brand-accent)] flex-shrink-0' />
								<div className='flex-1 min-w-0'>
									<p className='text-[10px] text-[var(--color-text-muted)]'>{item.label}</p>
									<p className='text-sm text-[var(--color-text-primary)] truncate'>{item.value}</p>
								</div>
							</div>
							{i < arr.length - 1 && <Separator />}
						</div>
					))
				)}
			</motion.div>

			{/* Quick links */}
			<motion.div
				variants={slideUp}
				className='bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden'
			>
				{quickLinks.map((link, i) => (
					<div key={link.to}>
						<Link
							to={link.to}
							className='flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--color-surface-elevated)] transition-colors'
						>
							<div className='w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand-accent-light)] flex items-center justify-center flex-shrink-0'>
								<link.icon size={15} className='text-[var(--color-brand-accent)]' />
							</div>
							<p className='flex-1 text-sm font-medium text-[var(--color-text-primary)]'>{link.label}</p>
							{link.count !== null && link.count !== undefined && (
								<Badge variant='secondary' className='text-[10px]'>{link.count}</Badge>
							)}
							<ChevronRight size={14} className='text-[var(--color-text-muted)] flex-shrink-0' />
						</Link>
						{i < quickLinks.length - 1 && <Separator />}
					</div>
				))}
			</motion.div>

		{/* Member since */}
		{user && (
			<motion.div variants={slideUp} className='text-center'>
				<p className='text-xs text-[var(--color-text-muted)]'>
					Member since {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
				</p>
			</motion.div>
		)}

		{/* Danger Zone */}
		<motion.div
			variants={slideUp}
			className='rounded-[var(--radius-xl)] border border-red-200 bg-red-50 overflow-hidden'
		>
			<div className='px-4 py-3 border-b border-red-200'>
				<p className='text-sm font-semibold text-red-700'>Danger Zone</p>
			</div>
			<div className='px-4 py-4 flex items-start justify-between gap-4'>
				<div className='flex-1 min-w-0'>
					<p className='text-sm font-medium text-red-700'>Delete Account</p>
					<p className='text-xs text-red-500 mt-0.5 leading-relaxed'>
						Permanently delete your account, all orders, and data. This cannot be undone.
					</p>
				</div>
				<button
					type='button'
					onClick={openDeleteDialog}
					className='flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-md)] bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all flex-shrink-0'
				>
					<Trash2 size={13} />
					Delete
				</button>
			</div>
		</motion.div>

		{/* Delete Confirmation Dialog */}
		<AnimatePresence>
			{showDeleteDialog && (
				<motion.div
					key='delete-backdrop'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.18 }}
					className='fixed inset-0 z-[9999] flex items-center justify-center px-4'
					style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
				>
					<motion.div
						key='delete-dialog'
						initial={{ scale: 0.93, opacity: 0, y: 16 }}
						animate={{ scale: 1, opacity: 1, y: 0 }}
						exit={{ scale: 0.93, opacity: 0, y: 16 }}
						transition={{ type: 'spring', damping: 26, stiffness: 340 }}
						className='w-full max-w-sm bg-white rounded-[var(--radius-xl)] shadow-2xl overflow-hidden'
					>
						{/* Dialog header */}
						<div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-red-100'>
							<div className='flex items-center gap-2.5'>
								<div className='w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0'>
									<AlertTriangle size={17} className='text-red-600' />
								</div>
								<div>
									<p className='text-sm font-bold text-[var(--color-text-primary)]'>Delete Account</p>
									<p className='text-[11px] text-red-500'>This action is permanent and irreversible</p>
								</div>
							</div>
							<button
								type='button'
								onClick={() => setShowDeleteDialog(false)}
								disabled={isDeleting}
								className='w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors'
							>
								<X size={15} />
							</button>
						</div>

						{/* Dialog body */}
						<div className='px-5 py-4 space-y-4'>
							<div className='space-y-2 text-sm text-[var(--color-text-secondary)] leading-relaxed'>
								<p>The following will be <strong className='text-red-600'>permanently deleted</strong>:</p>
								<ul className='space-y-1 pl-4 text-xs'>
									{[
										'Your account and profile',
										'All order history',
										'Saved favorites',
										'Impact stats and eco level',
										'Your WorkOS identity',
									].map((item) => (
										<li key={item} className='flex items-center gap-2 text-red-600'>
											<span className='w-1 h-1 rounded-full bg-red-400 flex-shrink-0' />
											{item}
										</li>
									))}
								</ul>
							</div>

							<div className='space-y-1.5'>
								<label className='text-xs font-semibold text-[var(--color-text-primary)]'>
									Type <span className='font-mono text-red-600 bg-red-50 px-1 rounded'>DELETE</span> to confirm
								</label>
								<input
									type='text'
									value={deleteConfirmText}
									onChange={(e) => setDeleteConfirmText(e.target.value)}
									placeholder='DELETE'
									disabled={isDeleting}
									className='w-full h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 transition-colors disabled:opacity-60'
								/>
							</div>

							{deleteError && (
								<motion.div
									initial={{ opacity: 0, y: -4 }}
									animate={{ opacity: 1, y: 0 }}
									className='flex items-start gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-red-50 border border-red-200'
								>
									<AlertTriangle size={13} className='text-red-500 flex-shrink-0 mt-0.5' />
									<p className='text-xs text-red-700'>{deleteError}</p>
								</motion.div>
							)}
						</div>

						{/* Dialog footer */}
						<div className='px-5 pb-5 flex gap-2'>
							<Button
								variant='outline'
								size='sm'
								className='flex-1'
								onClick={() => setShowDeleteDialog(false)}
								disabled={isDeleting}
							>
								Cancel
							</Button>
							<button
								type='button'
								onClick={handleDeleteAccount}
								disabled={deleteConfirmText !== 'DELETE' || isDeleting}
								className='flex-1 flex items-center justify-center gap-1.5 h-9 px-3 rounded-[var(--radius-full)] bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
							>
								{isDeleting ? (
									<Loader2 size={14} className='animate-spin' />
								) : (
									<>
										<Trash2 size={13} />
										Delete Forever
									</>
								)}
							</button>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	</motion.div>
)
}
