import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
	Building2,
	MapPin,
	Clock,
	FileText,
	CheckCircle2,
	ChevronRight,
	ChevronLeft,
	Upload,
	Camera,
	Phone,
	Mail,
	Users,
	Leaf,
	Sparkles,
	AlertCircle,
	Truck,
	Heart,
	Weight,
	Loader2,
	Landmark,
	Home,
	Utensils,
	Baby,
	PersonStanding,
	AlertOctagon,
	BookOpen,
	HeartHandshake,
	Bike,
	Car,
	Navigation,
} from 'lucide-react'
import type React from 'react'
import { cn } from '@/lib/utils'
import { useNGOUIStore } from '@/stores/ngo-ui-store'
import { profileApi } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

// ── Types ────────────────────────────────────────────────────
interface OnboardingForm {
	// Step 1 — Organisation identity
	orgName: string
	regNumber: string
	contactPerson: string
	email: string
	phone: string
	category: string
	description: string
	// Step 2 — Location & operations
	address: string
	city: string
	pincode: string
	serviceAreas: string
	openTime: string
	closeTime: string
	closedDays: string[]
	pickupCapacityKg: string
	vehicleType: string
	// Step 3 — Documents
	ngoRegDoc: string
	panNumber: string
	fcraNumber: string
	// Step 4 — Preview (no inputs)
}

const CATEGORIES: { value: string; label: string; icon: React.ReactNode }[] = [
	{ value: 'food_bank', label: 'Food Bank', icon: <Landmark size={20} /> },
	{ value: 'shelter', label: 'Shelter', icon: <Home size={20} /> },
	{ value: 'community_kitchen', label: 'Community Kitchen', icon: <Utensils size={20} /> },
	{ value: 'orphanage', label: 'Orphanage', icon: <Baby size={20} /> },
	{ value: 'old_age_home', label: 'Old Age Home', icon: <PersonStanding size={20} /> },
	{ value: 'disaster_relief', label: 'Disaster Relief', icon: <AlertOctagon size={20} /> },
	{ value: 'educational', label: 'Educational', icon: <BookOpen size={20} /> },
	{ value: 'other', label: 'Other', icon: <HeartHandshake size={20} /> },
]

const VEHICLE_TYPES: { value: string; label: string; icon: React.ReactNode }[] = [
	{ value: 'bicycle', label: 'Bicycle', icon: <Bike size={20} /> },
	{ value: 'two_wheeler', label: 'Two Wheeler', icon: <Bike size={20} /> },
	{ value: 'auto', label: 'Auto', icon: <Navigation size={20} /> },
	{ value: 'van', label: 'Van', icon: <Car size={20} /> },
	{ value: 'truck', label: 'Truck', icon: <Truck size={20} /> },
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const STEPS = [
	{ id: 1, label: 'Organisation', icon: Building2 },
	{ id: 2, label: 'Operations', icon: Truck },
	{ id: 3, label: 'Documents', icon: FileText },
	{ id: 4, label: 'Go Live', icon: Sparkles },
]

// ── Sub-components ───────────────────────────────────────────
function Field({
	label,
	required,
	hint,
	children,
}: {
	label: string
	required?: boolean
	hint?: string
	children: React.ReactNode
}) {
	return (
		<div className='space-y-1.5'>
			<label className='text-sm font-medium text-[var(--color-ngo-text-primary)]'>
				{label}
				{required && <span className='text-red-500 ml-0.5'>*</span>}
			</label>
			{children}
			{hint && <p className='text-[11px] text-[var(--color-ngo-text-muted)]'>{hint}</p>}
		</div>
	)
}

function TextInput({
	value,
	onChange,
	placeholder,
	type = 'text',
	icon,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	type?: string
	icon?: React.ReactNode
}) {
	return (
		<div className='relative'>
			{icon && (
				<span className='absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ngo-text-muted)]'>{icon}</span>
			)}
			<input
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className={cn(
					'w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ngo-border)] bg-white',
					'text-[var(--color-ngo-text-primary)] placeholder:text-[var(--color-ngo-text-disabled)]',
					'focus:outline-none focus:border-[var(--color-ngo-accent)] focus:ring-1 focus:ring-[var(--color-ngo-accent)]',
					'transition-colors',
					icon && 'pl-9',
				)}
			/>
		</div>
	)
}

function TextArea({
	value,
	onChange,
	placeholder,
	rows = 3,
}: {
	value: string
	onChange: (v: string) => void
	placeholder?: string
	rows?: number
}) {
	return (
		<textarea
			rows={rows}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			placeholder={placeholder}
			className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ngo-border)] bg-white text-[var(--color-ngo-text-primary)] placeholder:text-[var(--color-ngo-text-disabled)] focus:outline-none focus:border-[var(--color-ngo-accent)] focus:ring-1 focus:ring-[var(--color-ngo-accent)] transition-colors resize-none'
		/>
	)
}

// ── Step 1 — Organisation Identity ───────────────────────────
function Step1({ form, update }: { form: OnboardingForm; update: (k: keyof OnboardingForm, v: string) => void }) {
	return (
		<div className='space-y-5'>
			{/* Logo upload */}
			<div className='flex flex-col items-center gap-3 py-4'>
				<div className='relative'>
					<div className='w-20 h-20 rounded-full bg-[var(--color-ngo-accent-muted)] border-2 border-dashed border-[var(--color-ngo-accent)] flex items-center justify-center'>
						<Camera size={22} className='text-[var(--color-ngo-accent)]' />
					</div>
					<button className='absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--color-ngo-accent)] rounded-full flex items-center justify-center shadow-md'>
						<Upload size={13} className='text-white' />
					</button>
				</div>
				<p className='text-xs text-[var(--color-ngo-text-muted)]'>Upload organisation logo (optional)</p>
			</div>

			<Field label='Organisation Name' required>
				<TextInput
					value={form.orgName}
					onChange={(v) => update('orgName', v)}
					placeholder='e.g. Aahar Foundation'
					icon={<Building2 size={15} />}
				/>
			</Field>

			<Field label='NGO Registration Number' required hint='As per your Societies/Trust registration certificate'>
				<TextInput
					value={form.regNumber}
					onChange={(v) => update('regNumber', v)}
					placeholder='MH/2024/0042391'
					icon={<FileText size={15} />}
				/>
			</Field>

			<Field label='Contact Person' required>
				<TextInput
					value={form.contactPerson}
					onChange={(v) => update('contactPerson', v)}
					placeholder='Full name of primary contact'
					icon={<Users size={15} />}
				/>
			</Field>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<Field label='Email' required>
					<TextInput
						value={form.email}
						onChange={(v) => update('email', v)}
						placeholder='contact@ngo.org'
						type='email'
						icon={<Mail size={15} />}
					/>
				</Field>
				<Field label='Phone' required>
					<TextInput
						value={form.phone}
						onChange={(v) => update('phone', v)}
						placeholder='+91 98765 00000'
						icon={<Phone size={15} />}
					/>
				</Field>
			</div>

			<Field label='Organisation Type' required>
				<div className='grid grid-cols-2 sm:grid-cols-4 gap-2'>
					{CATEGORIES.map((c) => (
						<button
							key={c.value}
							onClick={() => update('category', c.value)}
							className={cn(
								'flex flex-col items-center gap-1 p-3 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
								form.category === c.value
									? 'border-[var(--color-ngo-accent)] bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)]'
									: 'border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] hover:border-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)]',
							)}
						>
							<span className='flex items-center justify-center'>{c.icon}</span>
							{c.label}
						</button>
					))}
				</div>
			</Field>

			<Field label='About Your Organisation' hint='Help donors understand your mission (min. 40 chars)'>
				<TextArea
					value={form.description}
					onChange={(v) => update('description', v)}
					placeholder='We rescue surplus food from restaurants and bakeries to feed underprivileged communities...'
					rows={4}
				/>
				<p className='text-[10px] text-[var(--color-ngo-text-disabled)] mt-1 text-right'>
					{form.description.length} / 400
				</p>
			</Field>
		</div>
	)
}

// ── Step 2 — Location & Operations ───────────────────────────
function Step2({
	form,
	update,
	toggleDay,
}: {
	form: OnboardingForm
	update: (k: keyof OnboardingForm, v: string) => void
	toggleDay: (day: string) => void
}) {
	return (
		<div className='space-y-5'>
			<Field label='Office / Base Address' required>
				<TextInput
					value={form.address}
					onChange={(v) => update('address', v)}
					placeholder='14, Nehru Nagar, Kurla West'
					icon={<MapPin size={15} />}
				/>
			</Field>

			<div className='grid grid-cols-2 gap-4'>
				<Field label='City' required>
					<TextInput
						value={form.city}
						onChange={(v) => update('city', v)}
						placeholder='Mumbai'
						icon={<Building2 size={15} />}
					/>
				</Field>
				<Field label='PIN Code' required>
					<TextInput
						value={form.pincode}
						onChange={(v) => update('pincode', v)}
						placeholder='400070'
					/>
				</Field>
			</div>

			<Field label='Service Areas' hint='Comma-separated localities where you distribute food'>
				<TextInput
					value={form.serviceAreas}
					onChange={(v) => update('serviceAreas', v)}
					placeholder='Kurla, Dharavi, Sion, Chunabhatti'
					icon={<Heart size={15} />}
				/>
			</Field>

			<Field label='Operating Hours' required>
				<div className='flex items-center gap-3'>
					<div className='flex-1 space-y-1'>
						<p className='text-xs text-[var(--color-ngo-text-muted)]'>Opens at</p>
						<input
							type='time'
							value={form.openTime}
							onChange={(e) => update('openTime', e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ngo-border)] bg-white text-[var(--color-ngo-text-primary)] focus:outline-none focus:border-[var(--color-ngo-accent)] focus:ring-1 focus:ring-[var(--color-ngo-accent)] transition-colors'
						/>
					</div>
					<div className='flex items-center justify-center pt-5'>
						<Clock size={16} className='text-[var(--color-ngo-text-muted)]' />
					</div>
					<div className='flex-1 space-y-1'>
						<p className='text-xs text-[var(--color-ngo-text-muted)]'>Closes at</p>
						<input
							type='time'
							value={form.closeTime}
							onChange={(e) => update('closeTime', e.target.value)}
							className='w-full text-sm px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-ngo-border)] bg-white text-[var(--color-ngo-text-primary)] focus:outline-none focus:border-[var(--color-ngo-accent)] focus:ring-1 focus:ring-[var(--color-ngo-accent)] transition-colors'
						/>
					</div>
				</div>
			</Field>

			<Field label='Closed Days' hint='Select days your NGO does not operate'>
				<div className='flex flex-wrap gap-2'>
					{DAYS.map((day) => {
						const closed = form.closedDays.includes(day)
						return (
							<button
								key={day}
								onClick={() => toggleDay(day)}
								className={cn(
									'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
									closed
										? 'bg-[var(--color-ngo-accent)] text-white border-[var(--color-ngo-accent)]'
										: 'border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] hover:border-[var(--color-ngo-accent)]',
								)}
							>
								{day.slice(0, 3)}
							</button>
						)
					})}
				</div>
			</Field>

			<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
				<Field label='Pickup Capacity (kg/day)' required hint='Maximum food weight you can handle per day'>
					<TextInput
						value={form.pickupCapacityKg}
						onChange={(v) => update('pickupCapacityKg', v)}
						placeholder='100'
						type='number'
						icon={<Weight size={15} />}
					/>
				</Field>
			</div>

			<Field label='Primary Vehicle Type' required>
				<div className='grid grid-cols-3 sm:grid-cols-5 gap-2'>
					{VEHICLE_TYPES.map((v) => (
						<button
							key={v.value}
							onClick={() => update('vehicleType', v.value)}
							className={cn(
								'flex flex-col items-center gap-1 p-3 rounded-[var(--radius-md)] border text-xs font-medium transition-all',
								form.vehicleType === v.value
									? 'border-[var(--color-ngo-accent)] bg-[var(--color-ngo-accent-light)] text-[var(--color-ngo-accent)]'
									: 'border-[var(--color-ngo-border)] text-[var(--color-ngo-text-secondary)] hover:border-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)]',
							)}
						>
							<span className='flex items-center justify-center'>{v.icon}</span>
							{v.label}
						</button>
					))}
				</div>
			</Field>

			{/* Map placeholder */}
			<div className='rounded-[var(--radius-lg)] border border-[var(--color-ngo-border)] overflow-hidden bg-[var(--color-ngo-surface-elevated)] h-32 flex items-center justify-center gap-2 text-[var(--color-ngo-text-muted)]'>
				<MapPin size={18} />
				<span className='text-sm'>Map pin placed automatically from your address</span>
			</div>
		</div>
	)
}

// ── Step 3 — Documents ───────────────────────────────────────
function Step3({ form, update }: { form: OnboardingForm; update: (k: keyof OnboardingForm, v: string) => void }) {
	return (
		<div className='space-y-5'>
			{/* Info banner */}
			<div className='flex gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-ngo-accent-light)] border border-[var(--color-ngo-border-subtle)]'>
				<AlertCircle size={16} className='text-[var(--color-ngo-accent)] flex-shrink-0 mt-0.5' />
				<p className='text-xs text-[var(--color-ngo-text-secondary)] leading-relaxed'>
					Your documents are encrypted and reviewed by our team within 48 hours. You can start receiving
					donation alerts while verification is pending.
				</p>
			</div>

			<Field label='NGO Registration Certificate' required hint='Certificate from Registrar of Societies / Charity Commissioner'>
				<TextInput
					value={form.ngoRegDoc}
					onChange={(v) => update('ngoRegDoc', v)}
					placeholder='Registration number'
					icon={<FileText size={15} />}
				/>
			</Field>

			{/* Certificate upload */}
			<div className='border-2 border-dashed border-[var(--color-ngo-border)] rounded-[var(--radius-md)] p-4 flex flex-col items-center gap-2 hover:border-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)] transition-colors cursor-pointer group'>
				<Upload size={20} className='text-[var(--color-ngo-text-muted)] group-hover:text-[var(--color-ngo-accent)]' />
				<p className='text-xs text-[var(--color-ngo-text-muted)] group-hover:text-[var(--color-ngo-text-secondary)]'>
					Upload registration certificate (PDF or JPG)
				</p>
			</div>

			<Field label='PAN Number' required hint='Organisation PAN for tax compliance'>
				<TextInput
					value={form.panNumber}
					onChange={(v) => update('panNumber', v)}
					placeholder='AABCA1234M'
					icon={<FileText size={15} />}
				/>
			</Field>

			<Field label='FCRA Registration Number' hint='Optional — required if accepting foreign contributions'>
				<TextInput
					value={form.fcraNumber}
					onChange={(v) => update('fcraNumber', v)}
					placeholder='094421234000001'
					icon={<FileText size={15} />}
				/>
			</Field>

			{/* PAN upload */}
			<div className='border-2 border-dashed border-[var(--color-ngo-border)] rounded-[var(--radius-md)] p-4 flex flex-col items-center gap-2 hover:border-[var(--color-ngo-accent)] hover:bg-[var(--color-ngo-accent-light)] transition-colors cursor-pointer group'>
				<Upload size={20} className='text-[var(--color-ngo-text-muted)] group-hover:text-[var(--color-ngo-accent)]' />
				<p className='text-xs text-[var(--color-ngo-text-muted)] group-hover:text-[var(--color-ngo-text-secondary)]'>
					Upload PAN card copy (PDF or JPG)
				</p>
			</div>
		</div>
	)
}

// ── Step 4 — Preview / Go Live ────────────────────────────────
function Step4({ form }: { form: OnboardingForm }) {
	const cat = CATEGORIES.find((c) => c.value === form.category)
	const vehicle = VEHICLE_TYPES.find((v) => v.value === form.vehicleType)
	const closedText =
		form.closedDays.length > 0 ? form.closedDays.map((d) => d.slice(0, 3)).join(', ') : 'Open every day'

	const checks = [
		{ label: 'Organisation name & description', done: !!form.orgName && form.description.length >= 10 },
		{ label: 'Registration number', done: !!form.regNumber },
		{ label: 'Contact info', done: !!form.email && !!form.phone },
		{ label: 'Address & service areas', done: !!form.address && !!form.city },
		{ label: 'Pickup capacity & vehicle', done: !!form.pickupCapacityKg && !!form.vehicleType },
		{ label: 'NGO registration document', done: !!form.ngoRegDoc },
		{ label: 'PAN number', done: !!form.panNumber },
	]
	const allDone = checks.every((c) => c.done)

	return (
		<div className='space-y-5'>
			{/* NGO preview card */}
			<div className='rounded-[var(--radius-xl)] border border-[var(--color-ngo-border)] overflow-hidden bg-white'>
				{/* Cover */}
				<div className='h-24 bg-gradient-to-br from-[var(--color-ngo-secondary)] to-[var(--color-ngo-accent-muted)] flex items-center justify-center'>
					<span className='flex items-center justify-center text-white'>{cat?.icon ?? <HeartHandshake size={36} />}</span>
				</div>
				<div className='p-4 -mt-6 relative'>
					<div className='w-14 h-14 rounded-full bg-white border-2 border-[var(--color-ngo-border)] flex items-center justify-center shadow-sm mb-3'>
						{cat?.icon ?? <HeartHandshake size={22} />}
					</div>
					<h2 className='text-lg font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
						{form.orgName || 'Your Organisation'}
					</h2>
					<p className='text-xs text-[var(--color-ngo-text-muted)] mb-1'>{cat?.label ?? 'Category'}</p>
					{form.description && (
						<p className='text-sm text-[var(--color-ngo-text-secondary)] leading-relaxed line-clamp-2 mt-1'>
							{form.description}
						</p>
					)}
					{form.address && (
						<div className='flex items-center gap-1 mt-2'>
							<MapPin size={12} className='text-[var(--color-ngo-text-muted)]' />
							<span className='text-xs text-[var(--color-ngo-text-muted)]'>
								{form.address}, {form.city}
							</span>
						</div>
					)}
					{form.openTime && form.closeTime && (
						<div className='flex items-center gap-1 mt-1'>
							<Clock size={12} className='text-[var(--color-ngo-text-muted)]' />
							<span className='text-xs text-[var(--color-ngo-text-muted)]'>
								{form.openTime} – {form.closeTime} · {closedText}
							</span>
						</div>
					)}
					{form.pickupCapacityKg && vehicle && (
					<div className='flex items-center gap-1 mt-1'>
						<span className='flex items-center'>{vehicle.icon}</span>
							<span className='text-xs text-[var(--color-ngo-text-muted)]'>
								{vehicle.label} · up to {form.pickupCapacityKg} kg/day
							</span>
						</div>
					)}
				</div>
			</div>

			{/* Checklist */}
			<div className='space-y-2'>
				<p className='text-sm font-semibold text-[var(--color-ngo-text-primary)]'>Setup checklist</p>
				{checks.map((c) => (
					<div key={c.label} className='flex items-center gap-2.5'>
						<div
							className={cn(
								'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
								c.done ? 'bg-[var(--color-ngo-eco-muted)]' : 'bg-[var(--color-ngo-border-subtle)]',
							)}
						>
							<CheckCircle2
								size={13}
								className={c.done ? 'text-[var(--color-ngo-accent)]' : 'text-[var(--color-ngo-text-disabled)]'}
							/>
						</div>
						<span
							className={cn(
								'text-sm',
								c.done ? 'text-[var(--color-ngo-text-primary)]' : 'text-[var(--color-ngo-text-muted)] line-through',
							)}
						>
							{c.label}
						</span>
					</div>
				))}
			</div>

			{/* Eco impact teaser */}
			<div className='rounded-[var(--radius-lg)] bg-gradient-to-br from-[#0a2e14] to-[#1a5c2a] p-4 flex items-center gap-4'>
				<Leaf size={28} className='text-[var(--color-ngo-secondary)] flex-shrink-0' />
				<div>
					<p className='text-white font-semibold text-sm'>Join 380+ NGOs fighting food waste</p>
					<p className='text-white/60 text-xs mt-0.5'>
						Together we've rescued 18,000+ kg of food this month across Mumbai.
					</p>
				</div>
			</div>

			{!allDone && (
				<div className='flex gap-2 p-3 rounded-[var(--radius-md)] bg-[var(--color-warning-light)] border border-amber-200'>
					<AlertCircle size={15} className='text-amber-600 flex-shrink-0 mt-0.5' />
					<p className='text-xs text-amber-700'>
						Some required fields are missing. You can still register but your account will be pending
						verification.
					</p>
				</div>
			)}
		</div>
	)
}

// ── Main Onboarding Page ─────────────────────────────────────
export function NGOOnboardingPage() {
	const navigate = useNavigate()
	const { refreshUser } = useAuth()
	const { onboardingStep, setOnboardingStep } = useNGOUIStore()

	const [animDir, setAnimDir] = useState<1 | -1>(1)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const step = onboardingStep

	const [form, setForm] = useState<OnboardingForm>({
		orgName: '',
		regNumber: '',
		contactPerson: '',
		email: '',
		phone: '',
		category: '',
		description: '',
		address: '',
		city: '',
		pincode: '',
		serviceAreas: '',
		openTime: '07:00',
		closeTime: '21:00',
		closedDays: [],
		pickupCapacityKg: '',
		vehicleType: '',
		ngoRegDoc: '',
		panNumber: '',
		fcraNumber: '',
	})

	function update(key: keyof OnboardingForm, value: string) {
		setForm((f) => ({ ...f, [key]: value }))
	}

	function toggleDay(day: string) {
		setForm((f) => ({
			...f,
			closedDays: f.closedDays.includes(day)
				? f.closedDays.filter((d) => d !== day)
				: [...f.closedDays, day],
		}))
	}

	function next() {
		setAnimDir(1)
		if (step < 3) setOnboardingStep(step + 1)
	}

	function prev() {
		setAnimDir(-1)
		if (step > 0) setOnboardingStep(step - 1)
	}

	async function finish() {
		setIsSubmitting(true)
		try {
			await profileApi.updateNGOProfile({
				organization_name: form.orgName || null,
				registration_number: form.regNumber || null,
				mission_statement: form.description || null,
				phone_number: form.phone || null,
				address_line1: form.address || null,
				city: form.city || null,
				postal_code: form.pincode || null,
				country: 'IN',
				serving_capacity: form.pickupCapacityKg ? Number(form.pickupCapacityKg) : null,
			})
		} catch {
			// Non-blocking — proceed to dashboard even if profile update fails
		} finally {
			setIsSubmitting(false)
		}
		await refreshUser()
		navigate('/ngo/dashboard', { replace: true })
	}

	const isLastStep = step === 3

	const variants = {
		enter: (dir: number) => ({ opacity: 0, x: dir * 40 }),
		center: { opacity: 1, x: 0 },
		exit: (dir: number) => ({ opacity: 0, x: dir * -40 }),
	}

	return (
		<div className='min-h-dvh bg-[var(--color-ngo-bg)] flex flex-col'>
			{/* ── Top bar ── */}
			<div className='sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--color-ngo-border)]'>
				<div className='max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3'>
					<div className='flex items-center gap-2'>
						<div className='w-7 h-7 rounded-full bg-[var(--color-ngo-accent)] flex items-center justify-center'>
							<Leaf size={14} className='text-white' />
						</div>
						<span className='text-sm font-semibold text-[var(--color-ngo-text-primary)] font-[var(--font-display)]'>
							RePlate NGO
						</span>
					</div>
					<span className='text-xs text-[var(--color-ngo-text-muted)]'>
						Step {step + 1} of {STEPS.length}
					</span>
				</div>

				{/* Progress bar */}
				<div className='h-1 bg-[var(--color-ngo-border-subtle)]'>
					<motion.div
						className='h-full bg-[var(--color-ngo-accent)] rounded-r-full'
						initial={false}
						animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
						transition={{ duration: 0.3, ease: 'easeOut' }}
					/>
				</div>
			</div>

			{/* ── Step indicators ── */}
			<div className='max-w-xl mx-auto w-full px-4 pt-6 pb-2'>
				<div className='flex items-center gap-0'>
					{STEPS.map((s, i) => {
						const done = i < step
						const active = i === step
						const Icon = s.icon
						return (
							<div key={s.id} className='flex items-center flex-1 last:flex-none'>
								<div className='flex flex-col items-center gap-1'>
									<div
										className={cn(
											'w-9 h-9 rounded-full flex items-center justify-center transition-all border-2',
											done
												? 'bg-[var(--color-ngo-accent)] border-[var(--color-ngo-accent)]'
												: active
													? 'bg-white border-[var(--color-ngo-accent)] shadow-sm'
													: 'bg-white border-[var(--color-ngo-border)]',
										)}
									>
										{done ? (
											<CheckCircle2 size={16} className='text-white' />
										) : (
											<Icon
												size={16}
												className={active ? 'text-[var(--color-ngo-accent)]' : 'text-[var(--color-ngo-text-disabled)]'}
											/>
										)}
									</div>
									<span
										className={cn(
											'text-[10px] font-medium whitespace-nowrap',
											active
												? 'text-[var(--color-ngo-accent)]'
												: done
													? 'text-[var(--color-ngo-text-muted)]'
													: 'text-[var(--color-ngo-text-disabled)]',
										)}
									>
										{s.label}
									</span>
								</div>
								{i < STEPS.length - 1 && (
									<div
										className={cn(
											'flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all',
											i < step ? 'bg-[var(--color-ngo-accent)]' : 'bg-[var(--color-ngo-border)]',
										)}
									/>
								)}
							</div>
						)
					})}
				</div>
			</div>

			{/* ── Step content ── */}
			<div className='flex-1 max-w-xl mx-auto w-full px-4 pb-4 overflow-hidden'>
				{/* Step title */}
				<div className='mb-5'>
					<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-ngo-text-primary)]'>
						{step === 0 && 'Tell us about your organisation'}
						{step === 1 && 'How do you operate?'}
						{step === 2 && 'Compliance documents'}
						{step === 3 && 'Ready to start rescuing food!'}
					</h1>
					<p className='text-sm text-[var(--color-ngo-text-muted)] mt-1'>
						{step === 0 && 'Help donors and volunteers understand your mission.'}
						{step === 1 && 'Set your pickup capacity and operating schedule.'}
						{step === 2 && "We'll verify your documents within 48 hours."}
						{step === 3 && 'Review your details before going live.'}
					</p>
				</div>

				<AnimatePresence mode='wait' custom={animDir}>
					<motion.div
						key={step}
						custom={animDir}
						variants={variants}
						initial='enter'
						animate='center'
						exit='exit'
						transition={{ duration: 0.22, ease: 'easeOut' }}
					>
						{step === 0 && <Step1 form={form} update={update} />}
						{step === 1 && <Step2 form={form} update={update} toggleDay={toggleDay} />}
						{step === 2 && <Step3 form={form} update={update} />}
						{step === 3 && <Step4 form={form} />}
					</motion.div>
				</AnimatePresence>
			</div>

			{/* ── Footer navigation ── */}
			<div className='sticky bottom-0 bg-white border-t border-[var(--color-ngo-border)] px-4 py-3'>
				<div className='max-w-xl mx-auto flex items-center gap-3'>
					{step > 0 ? (
						<button
							onClick={prev}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-ngo-border)] text-sm font-medium text-[var(--color-ngo-text-secondary)] hover:border-[var(--color-ngo-accent)] hover:text-[var(--color-ngo-accent)] transition-colors'
						>
							<ChevronLeft size={16} />
							Back
						</button>
					) : (
						<button
							onClick={() => navigate('/ngo/dashboard')}
							className='flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[var(--color-ngo-border)] text-sm font-medium text-[var(--color-ngo-text-muted)] hover:border-[var(--color-ngo-accent)] transition-colors'
						>
							Skip for now
						</button>
					)}

					<button
						onClick={isLastStep ? finish : next}
						disabled={isSubmitting}
						className='flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-[var(--color-ngo-accent)] text-white text-sm font-semibold hover:bg-[var(--color-ngo-accent-hover)] active:scale-95 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed'
					>
						{isLastStep ? (
							isSubmitting ? (
								<Loader2 size={16} className='animate-spin' />
							) : (
								<>
									<Sparkles size={16} />
									Start Rescuing Food
								</>
							)
						) : (
							<>
								Continue
								<ChevronRight size={16} />
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	)
}
