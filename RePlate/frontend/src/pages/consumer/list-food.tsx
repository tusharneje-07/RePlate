import { useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { consumerApi, uploadFile } from '@/lib/api'
import { motion, AnimatePresence } from 'motion/react'
import {
	Leaf,
	ChevronRight,
	ChevronLeft,
	Clock,
	MapPin,
	Package,
	Thermometer,
	Camera,
	FileText,
	ShieldCheck,
	CheckCircle2,
	Utensils,
	Scale,
	CalendarClock,
	Info,
	AlertTriangle,
	X,
	ImagePlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDateTimeIST } from '@/lib/utils'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import type { DietaryTag, FoodCategory, StorageType, PackagingCondition } from '@/types'

// ── Step definitions ──────────────────────────────────────
const STEPS = [
	{ id: 1, label: 'Food Details', icon: Utensils },
	{ id: 2, label: 'Quantity & Time', icon: Scale },
	{ id: 3, label: 'Pickup & Storage', icon: MapPin },
	{ id: 4, label: 'Safety & Submit', icon: ShieldCheck },
]

// ── Form state type ───────────────────────────────────────
interface ListingForm {
	foodName: string
	eventType: string
	category: FoodCategory | ''
	dietaryTag: DietaryTag | ''
	quantityKg: string
	servings: string
	cookedAt: string
	expiresAt: string
	pickupStart: string
	pickupEnd: string
	pickupLocation: string
	storageType: StorageType | ''
	packagingCondition: PackagingCondition | ''
	notes: string
	hygieneConfirmed: boolean
	images: string[]
}

const initialForm: ListingForm = {
	foodName: '',
	eventType: '',
	category: '',
	dietaryTag: '',
	quantityKg: '',
	servings: '',
	cookedAt: '',
	expiresAt: '',
	pickupStart: '',
	pickupEnd: '',
	pickupLocation: '',
	storageType: '',
	packagingCondition: '',
	notes: '',
	hygieneConfirmed: false,
	images: [],
}

// ── Option helpers ────────────────────────────────────────
const EVENT_TYPES = [
	'Birthday Party',
	'Wedding Function',
	'Corporate Event',
	'Office Party',
	'Family Gathering',
	'Festival Celebration',
	'Religious Ceremony',
	'Other',
]

const CATEGORIES: { value: FoodCategory; label: string }[] = [
	{ value: 'meals', label: 'Meal / Cooked Food' },
	{ value: 'snacks', label: 'Snacks' },
	{ value: 'sweets', label: 'Sweets / Desserts' },
	{ value: 'bakery', label: 'Bakery' },
	{ value: 'beverages', label: 'Beverages' },
	{ value: 'grocery', label: 'Grocery / Produce' },
]

const DIETARY_TAGS: { value: DietaryTag; label: string }[] = [
	{ value: 'veg', label: 'Vegetarian' },
	{ value: 'non-veg', label: 'Non-Vegetarian' },
	{ value: 'vegan', label: 'Vegan' },
	{ value: 'jain', label: 'Jain' },
	{ value: 'gluten-free', label: 'Gluten-Free' },
]

const STORAGE_TYPES: { value: StorageType; label: string; desc: string }[] = [
	{ value: 'room_temp', label: 'Room Temperature', desc: 'Covered and stored at ambient temp' },
	{ value: 'refrigerated', label: 'Refrigerated', desc: 'Stored in fridge at 0–4°C' },
	{ value: 'frozen', label: 'Frozen', desc: 'Stored in freezer' },
]

const PACKAGING_CONDITIONS: { value: PackagingCondition; label: string }[] = [
	{ value: 'sealed', label: 'Sealed Containers' },
	{ value: 'covered', label: 'Covered Dishes' },
	{ value: 'containers', label: 'Open Containers' },
	{ value: 'open', label: 'Open / Loose' },
]

// ── Sub-components ────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
	return (
		<div className='flex items-center justify-between mb-8'>
			{STEPS.map((step, idx) => {
				const isCompleted = currentStep > step.id
				const isActive = currentStep === step.id
				const Icon = step.icon
				return (
					<div key={step.id} className='flex items-center flex-1'>
						<div className='flex flex-col items-center gap-1'>
							<div
								className={cn(
									'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 border-2',
									isCompleted
										? 'bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)] text-white'
										: isActive
											? 'bg-[var(--color-brand-accent-light)] border-[var(--color-brand-accent)] text-[var(--color-brand-accent)]'
											: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-text-muted)]',
								)}
							>
								{isCompleted ? (
									<CheckCircle2 size={16} />
								) : (
									<Icon size={15} />
								)}
							</div>
							<span
								className={cn(
									'text-[10px] font-medium hidden sm:block',
									isActive
										? 'text-[var(--color-brand-accent)]'
										: 'text-[var(--color-text-muted)]',
								)}
							>
								{step.label}
							</span>
						</div>
						{idx < STEPS.length - 1 && (
							<div
								className={cn(
									'flex-1 h-0.5 mx-2 mb-4 transition-colors duration-200',
									currentStep > step.id
										? 'bg-[var(--color-brand-accent)]'
										: 'bg-[var(--color-border)]',
								)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}

function ChipGroup<T extends string>({
	options,
	value,
	onChange,
}: {
	options: { value: T; label: string }[]
	value: T | ''
	onChange: (v: T) => void
}) {
	return (
		<div className='flex flex-wrap gap-2'>
			{options.map((opt) => (
				<button
					key={opt.value}
					type='button'
					onClick={() => onChange(opt.value)}
					className={cn(
						'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
						value === opt.value
							? 'bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)] text-white'
							: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]',
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	)
}

function labelToId(label: string) {
	return `lf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

function FieldLabel({
	label,
	required,
	htmlFor,
	as: Tag = 'label',
}: {
	label: string
	required?: boolean
	htmlFor?: string
	as?: 'label' | 'p'
}) {
	return (
		<Tag
			{...(Tag === 'label' ? { htmlFor: htmlFor ?? labelToId(label) } : {})}
			className='block text-sm font-semibold text-[var(--color-text-primary)] mb-1.5'
		>
			{label}
			{required && <span className='text-[var(--color-brand-accent)] ml-0.5'>*</span>}
		</Tag>
	)
}

function InputField({
	label,
	required,
	type = 'text',
	value,
	onChange,
	placeholder,
	min,
	max,
}: {
	label: string
	required?: boolean
	type?: string
	value: string
	onChange: (v: string) => void
	placeholder?: string
	min?: string
	max?: string
}) {
	const id = labelToId(label)
	return (
		<div>
			<FieldLabel label={label} required={required} htmlFor={id} />
			<input
				id={id}
				name={id}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				min={min}
				max={max}
				className='w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]/30 focus:border-[var(--color-brand-accent)] transition-colors'
			/>
		</div>
	)
}

// ── Step 1: Food Details ──────────────────────────────────
function Step1({ form, update }: { form: ListingForm; update: (k: keyof ListingForm, v: string) => void }) {
	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-5'>
			<motion.div variants={slideUp}>
				<InputField
					label='Food Name / Type'
					required
					value={form.foodName}
					onChange={(v) => update('foodName', v)}
					placeholder='e.g. Veg Biryani, Birthday Cake, Paneer Curry'
				/>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Event Type' required as='p' />
			<div className='flex flex-wrap gap-2'>
					{EVENT_TYPES.map((e) => (
						<button
							key={e}
							type='button'
							onClick={() => update('eventType', e)}
							className={cn(
								'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150',
								form.eventType === e
									? 'bg-[var(--color-brand-accent)] border-[var(--color-brand-accent)] text-white'
									: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-brand-accent)] hover:text-[var(--color-brand-accent)]',
							)}
						>
							{e}
						</button>
					))}
				</div>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Food Category' required as='p' />
			<ChipGroup
					options={CATEGORIES}
					value={form.category}
					onChange={(v) => update('category', v)}
				/>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Veg / Non-Veg' required as='p' />
			<ChipGroup
					options={DIETARY_TAGS}
					value={form.dietaryTag}
					onChange={(v) => update('dietaryTag', v)}
				/>
			</motion.div>
		</motion.div>
	)
}

// ── Helpers ───────────────────────────────────────────────
// Format a Date as "YYYY-MM-DDTHH:MM" in local browser time (IST).
// datetime-local inputs display and interpret values as local time,
// so min/max must also be expressed in local time — NOT UTC ISO strings.
function toLocalDatetimeStr(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0')
	return (
		d.getFullYear() + '-' +
		pad(d.getMonth() + 1) + '-' +
		pad(d.getDate()) + 'T' +
		pad(d.getHours()) + ':' +
		pad(d.getMinutes())
	)
}

// ── Step 2: Quantity & Time ───────────────────────────────
function Step2({ form, update }: { form: ListingForm; update: (k: keyof ListingForm, v: string) => void }) {
	// Max expiry = 24h from now — expressed in LOCAL time for datetime-local inputs
	const nowIso = toLocalDatetimeStr(new Date())
	const maxExpiryIso = toLocalDatetimeStr(new Date(Date.now() + 24 * 60 * 60 * 1000))

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-5'>
			<motion.div variants={slideUp} className='grid grid-cols-2 gap-4'>
				<InputField
					label='Quantity (kg)'
					required
					type='number'
					value={form.quantityKg}
					onChange={(v) => update('quantityKg', v)}
					placeholder='e.g. 5'
					min='0.5'
				/>
				<InputField
					label='Servings (approx)'
					type='number'
					value={form.servings}
					onChange={(v) => update('servings', v)}
					placeholder='e.g. 20'
					min='1'
				/>
			</motion.div>

			<motion.div variants={slideUp}>
				<InputField
					label='Cooked / Prepared At'
					required
					type='datetime-local'
					value={form.cookedAt}
					onChange={(v) => update('cookedAt', v)}
					max={nowIso}
				/>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Expires At' required htmlFor='lf-expires-at' />
			<input
				id='lf-expires-at'
				name='lf-expires-at'
				type='datetime-local'
				value={form.expiresAt}
				onChange={(e) => update('expiresAt', e.target.value)}
				min={nowIso}
				max={maxExpiryIso}
				className='w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]/30 focus:border-[var(--color-brand-accent)] transition-colors'
			/>
				<div className='flex items-center gap-1.5 mt-1.5'>
					<AlertTriangle size={12} className='text-[var(--color-warning)] flex-shrink-0' />
					<p className='text-[11px] text-[var(--color-text-muted)]'>
						Expiry must be within 24 hours to ensure food safety.
					</p>
				</div>
			</motion.div>

			{/* Safety rule banner */}
			<motion.div
				variants={fadeIn}
				className='flex items-start gap-3 p-3 rounded-[var(--radius-lg)] bg-[var(--color-eco-muted)] border border-[var(--color-eco-light)]'
			>
				<Info size={15} className='text-[var(--color-eco)] flex-shrink-0 mt-0.5' />
				<p className='text-xs text-[var(--color-eco)] leading-relaxed'>
					Food must be freshly cooked. The 24-hour window ensures NGOs can safely distribute the food to people in need.
				</p>
			</motion.div>
		</motion.div>
	)
}

// ── Step 3: Pickup & Storage ──────────────────────────────
function Step3({ form, update }: { form: ListingForm; update: (k: keyof ListingForm, v: string) => void }) {
	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-5'>
			<motion.div variants={slideUp}>
				<InputField
					label='Pickup Location'
					required
					value={form.pickupLocation}
					onChange={(v) => update('pickupLocation', v)}
					placeholder='e.g. 12 MG Road, Baner, Pune'
				/>
			</motion.div>

			<motion.div variants={slideUp} className='grid grid-cols-2 gap-4'>
				<InputField
					label='Pickup From'
					required
					type='time'
					value={form.pickupStart}
					onChange={(v) => update('pickupStart', v)}
				/>
				<InputField
					label='Pickup Until'
					required
					type='time'
					value={form.pickupEnd}
					onChange={(v) => update('pickupEnd', v)}
				/>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Storage Type' required as='p' />
				<div className='space-y-2'>
					{STORAGE_TYPES.map((s) => (
						<button
							key={s.value}
							type='button'
							onClick={() => update('storageType', s.value)}
							className={cn(
								'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border text-left transition-all duration-150',
								form.storageType === s.value
									? 'bg-[var(--color-brand-accent-light)] border-[var(--color-brand-accent)]'
									: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] hover:border-[var(--color-brand-accent)]/50',
							)}
						>
							<Thermometer
								size={16}
								className={form.storageType === s.value ? 'text-[var(--color-brand-accent)]' : 'text-[var(--color-text-muted)]'}
							/>
							<div className='flex-1 min-w-0'>
								<p className={cn('text-sm font-semibold', form.storageType === s.value ? 'text-[var(--color-brand-accent)]' : 'text-[var(--color-text-primary)]')}>
									{s.label}
								</p>
								<p className='text-xs text-[var(--color-text-muted)]'>{s.desc}</p>
							</div>
							<div
								className={cn(
									'w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors',
									form.storageType === s.value
										? 'border-[var(--color-brand-accent)] bg-[var(--color-brand-accent)]'
										: 'border-[var(--color-border)]',
								)}
							/>
						</button>
					))}
				</div>
			</motion.div>

		<motion.div variants={slideUp}>
			<FieldLabel label='Packaging Condition' required as='p' />
			<ChipGroup
					options={PACKAGING_CONDITIONS}
					value={form.packagingCondition}
					onChange={(v) => update('packagingCondition', v)}
				/>
			</motion.div>
		</motion.div>
	)
}

// ── Step 4: Safety & Submit ───────────────────────────────
function Step4({
	form,
	update,
	updateBool,
	updateImages,
	onSubmit,
	submitting,
	submitError,
	onPickPhoto,
	uploading,
	uploadError,
}: {
	form: ListingForm
	update: (k: keyof ListingForm, v: string) => void
	updateBool: (k: keyof ListingForm, v: boolean) => void
	updateImages: (urls: string[]) => void
	onSubmit: () => void
	submitting?: boolean
	submitError?: string | null
	onPickPhoto: () => void
	uploading: boolean
	uploadError: string | null
}) {
	function removeImage(url: string) {
		updateImages(form.images.filter((u) => u !== url))
	}

	return (
		<motion.div variants={staggerContainer} initial='hidden' animate='visible' className='space-y-5'>
			{/* Photo upload section */}
			<motion.div variants={slideUp}>
				<FieldLabel label='Food Photos (Optional)' as='p' />

				{/* Preview grid + add button */}
				{form.images.length > 0 ? (
					<div className='grid grid-cols-4 gap-2'>
						{form.images.map((url) => (
							<div key={url} className='relative aspect-square rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]'>
								<img src={url} alt='Food photo' className='w-full h-full object-cover' />
								<button
									type='button'
									onClick={() => removeImage(url)}
									className='absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors'
								>
									<X size={10} />
								</button>
							</div>
						))}
						{form.images.length < 4 && (
							<button
								type='button'
								onClick={onPickPhoto}
								disabled={uploading}
								className='aspect-square rounded-[var(--radius-md)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-brand-accent)] transition-all duration-150 disabled:opacity-50'
							>
								<ImagePlus size={20} />
							</button>
						)}
					</div>
				) : (
					<button
						type='button'
						onClick={onPickPhoto}
						disabled={uploading}
						className='w-full flex flex-col items-center justify-center gap-3 p-6 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-light)] transition-all duration-150 text-[var(--color-text-muted)] hover:text-[var(--color-brand-accent)] disabled:opacity-50'
					>
						<Camera size={24} />
						<div className='text-center'>
							<p className='text-sm font-semibold'>{uploading ? 'Uploading…' : 'Tap to add photos'}</p>
							<p className='text-xs mt-0.5'>Up to 4 photos · Helps NGOs know what to expect</p>
						</div>
					</button>
				)}

				{uploading && (
					<p className='text-xs text-[var(--color-brand-accent)] mt-1.5 text-center'>Uploading photo…</p>
				)}
				{uploadError && (
					<p className='text-xs text-red-500 mt-1.5'>{uploadError}</p>
				)}
			</motion.div>

			{/* Special notes */}
		<motion.div variants={slideUp}>
			<FieldLabel label='Special Notes' htmlFor='lf-special-notes' />
			<div className='relative'>
				<FileText size={15} className='absolute left-3 top-3 text-[var(--color-text-muted)] pointer-events-none' />
				<textarea
					id='lf-special-notes'
					name='lf-special-notes'
					value={form.notes}
					onChange={(e) => update('notes', e.target.value)}
					placeholder='e.g. Contains nuts, very spicy, halal, made with ghee...'
					rows={3}
					className='w-full pl-9 pr-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-card)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]/30 focus:border-[var(--color-brand-accent)] transition-colors resize-none'
				/>
			</div>
		</motion.div>

			{/* Review summary */}
			<motion.div variants={slideUp}>
				<h3 className='text-sm font-bold text-[var(--color-text-primary)] mb-3 flex items-center gap-2'>
					<FileText size={14} className='text-[var(--color-brand-accent)]' />
					Listing Summary
				</h3>
				<Card className='overflow-hidden'>
					<CardContent className='p-4 space-y-2.5'>
						{[
							{ icon: Utensils, label: 'Food', value: form.foodName || '—' },
							{ icon: CalendarClock, label: 'Event', value: form.eventType || '—' },
							{ icon: Scale, label: 'Quantity', value: form.quantityKg ? `~${form.quantityKg} kg` : '—' },
							{ icon: Clock, label: 'Expires', value: form.expiresAt ? formatDateTimeIST(new Date(form.expiresAt), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', year: undefined }) : '—' },
							{ icon: MapPin, label: 'Pickup', value: form.pickupLocation || '—' },
							{ icon: Thermometer, label: 'Storage', value: STORAGE_TYPES.find(s => s.value === form.storageType)?.label || '—' },
						].map(({ icon: Icon, label, value }) => (
							<div key={label} className='flex items-center gap-3'>
								<div className='w-6 h-6 rounded-md bg-[var(--color-brand-accent-light)] flex items-center justify-center flex-shrink-0'>
									<Icon size={12} className='text-[var(--color-brand-accent)]' />
								</div>
								<span className='text-xs text-[var(--color-text-muted)] w-16 flex-shrink-0'>{label}</span>
								<span className='text-xs font-medium text-[var(--color-text-primary)] flex-1 truncate'>{value}</span>
							</div>
						))}
					</CardContent>
				</Card>
			</motion.div>

			{/* Safety declaration */}
			<motion.div
				variants={slideUp}
				className={cn(
					'flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border-2 cursor-pointer transition-all duration-150',
					form.hygieneConfirmed
						? 'bg-[var(--color-eco-muted)] border-[var(--color-eco-light)]'
						: 'bg-[var(--color-surface-elevated)] border-[var(--color-border)] hover:border-[var(--color-eco-light)]',
				)}
				onClick={() => updateBool('hygieneConfirmed', !form.hygieneConfirmed)}
			>
				<div
					className={cn(
						'w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-colors',
						form.hygieneConfirmed
							? 'bg-[var(--color-eco)] border-[var(--color-eco)]'
							: 'border-[var(--color-border)]',
					)}
				>
					{form.hygieneConfirmed && <CheckCircle2 size={12} className='text-white' />}
				</div>
				<div>
					<p className='text-sm font-semibold text-[var(--color-text-primary)]'>
						Hygiene & Safety Declaration
					</p>
					<p className='text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed'>
						I confirm this food is freshly prepared, stored safely, and fit for consumption. I take responsibility for the accuracy of this listing.
					</p>
				</div>
			</motion.div>

			<motion.div variants={slideUp}>
				<Button
					onClick={onSubmit}
					disabled={!form.hygieneConfirmed || submitting}
					size='lg'
					className='w-full gap-2 bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-white disabled:opacity-40 disabled:cursor-not-allowed'
				>
					<Leaf size={16} />
					{submitting ? 'Submitting...' : 'Submit Surplus Listing'}
				</Button>
				{submitError && (
					<p className='text-xs text-red-500 text-center mt-2'>{submitError}</p>
				)}
				<p className='text-[11px] text-[var(--color-text-muted)] text-center mt-2'>
					Nearby NGOs will be notified instantly
				</p>
			</motion.div>
		</motion.div>
	)
}

// ── Success screen ────────────────────────────────────────
function SuccessScreen({ foodName, onDone }: { foodName: string; onDone: () => void }) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3 }}
			className='flex flex-col items-center text-center py-12 px-4 gap-5'
		>
			<motion.div
				initial={{ scale: 0 }}
				animate={{ scale: 1 }}
				transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 20 }}
				className='w-20 h-20 rounded-full bg-[var(--color-eco-muted)] border-4 border-[var(--color-eco-light)] flex items-center justify-center'
			>
				<CheckCircle2 size={36} className='text-[var(--color-eco)]' />
			</motion.div>

			<div>
				<h2 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
					Listing Published
				</h2>
				<p className='text-sm text-[var(--color-text-muted)] mt-1.5 max-w-xs leading-relaxed'>
					<span className='font-semibold text-[var(--color-text-primary)]'>{foodName || 'Your food'}</span> has been listed. Nearby NGOs have been notified and will claim it shortly.
				</p>
			</div>

			<div className='grid grid-cols-3 gap-3 w-full max-w-xs'>
				{[
					{ icon: Package, label: 'Listed', value: '1' },
					{ icon: Leaf, label: 'CO₂ Impact', value: 'Tracked' },
					{ icon: Utensils, label: 'Meals', value: 'Counted' },
				].map(({ icon: Icon, label, value }) => (
					<div
						key={label}
						className='flex flex-col items-center gap-1.5 p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-elevated)]'
					>
						<Icon size={18} className='text-[var(--color-brand-accent)]' />
						<p className='text-sm font-bold text-[var(--color-text-primary)]'>{value}</p>
						<p className='text-[10px] text-[var(--color-text-muted)]'>{label}</p>
					</div>
				))}
			</div>

			<Button onClick={onDone} size='lg' variant='outline' className='gap-2 w-full max-w-xs'>
				Back to Dashboard
			</Button>
		</motion.div>
	)
}

// ── Main page ─────────────────────────────────────────────
export function ListFoodPage() {
	const navigate = useNavigate()
	const [step, setStep] = useState(1)
	const [submitted, setSubmitted] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [submitError, setSubmitError] = useState<string | null>(null)
	const [form, setForm] = useState<ListingForm>(initialForm)

	// ── Photo upload state — hoisted outside AnimatePresence so the
	//    native <input type="file"> ref always stays mounted in the DOM
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)

	const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files ?? [])
		if (files.length === 0) return
		const remaining = 4 - form.images.length
		const toUpload = files.slice(0, remaining)
		if (toUpload.length === 0) return
		setUploading(true)
		setUploadError(null)
		try {
			const uploaded = await Promise.all(toUpload.map((f) => uploadFile(f)))
			setForm((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }))
		} catch {
			setUploadError('Failed to upload photo. Please try again.')
		} finally {
			setUploading(false)
			if (fileInputRef.current) fileInputRef.current.value = ''
		}
	}, [form.images.length])

	function pickPhoto() {
		fileInputRef.current?.click()
	}

	function update(key: keyof ListingForm, value: string) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	function updateBool(key: keyof ListingForm, value: boolean) {
		setForm((prev) => ({ ...prev, [key]: value }))
	}

	function updateImages(urls: string[]) {
		setForm((prev) => ({ ...prev, images: urls }))
	}

	function canAdvance(): boolean {
		if (step === 1) return !!(form.foodName && form.eventType && form.category && form.dietaryTag)
		if (step === 2) return !!(form.quantityKg && form.cookedAt && form.expiresAt)
		if (step === 3) return !!(form.pickupLocation && form.pickupStart && form.pickupEnd && form.storageType && form.packagingCondition)
		return true
	}

	function handleNext() {
		if (step < 4) setStep(step + 1)
	}

	function handleBack() {
		if (step > 1) setStep(step - 1)
	}

	async function handleSubmit() {
		setSubmitting(true)
		setSubmitError(null)
		try {
			// Build pickup ISO strings from today's LOCAL date + form time.
			// Use local date (not UTC) so IST users get the correct date after midnight UTC.
			const localNow = new Date()
			const pad = (n: number) => String(n).padStart(2, '0')
			const today = `${localNow.getFullYear()}-${pad(localNow.getMonth() + 1)}-${pad(localNow.getDate())}`
			const pickupStartIso = form.pickupStart ? `${today}T${form.pickupStart}:00` : null
			const pickupEndIso = form.pickupEnd ? `${today}T${form.pickupEnd}:00` : null

			// Enforce 24h expiry cap.
			// datetime-local values are interpreted by the browser as local time,
			// so new Date(form.expiresAt) correctly converts IST → UTC internally.
			const maxExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
			const requestedExpiry = form.expiresAt ? new Date(form.expiresAt) : maxExpiry
			const expiresAt = (requestedExpiry > maxExpiry ? maxExpiry : requestedExpiry).toISOString()

			// Map dietary tag to food_type enum (backend expects 'nonveg', not 'non-veg')
			const foodType =
				form.dietaryTag === 'non-veg' ? 'nonveg' :
				form.dietaryTag === 'vegan'   ? 'vegan'  : 'veg'

			await consumerApi.createSurplusDonation({
				title: form.foodName,
				description: form.notes || null,
				category: form.category,
				food_type: foodType,
				dietary_tags: form.dietaryTag ? [form.dietaryTag] : [],
				quantity_kg: Math.max(0.1, parseFloat(form.quantityKg) || 1),
				servings: form.servings ? parseInt(form.servings) : null,
				cooked_at: form.cookedAt || null,
				pickup_start: pickupStartIso,
				pickup_end: pickupEndIso,
				expires_at: expiresAt,
				pickup_address: form.pickupLocation,
				storage_type: form.storageType || null,
				packaging_condition: form.packagingCondition || null,
				images: form.images.length > 0 ? form.images : undefined,
			})
			setSubmitted(true)
		} catch (err: unknown) {
			const msg = (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail
				?? (err as { response?: { data?: { message?: string } } })?.response?.data?.message
				?? 'Failed to submit listing. Please try again.'
			setSubmitError(String(msg))
		} finally {
			setSubmitting(false)
		}
	}

	if (submitted) {
		return (
			<div className='max-w-lg mx-auto'>
				<SuccessScreen foodName={form.foodName} onDone={() => navigate('/consumer/dashboard')} />
			</div>
		)
	}

	return (
		<motion.div
			variants={staggerContainer}
			initial='hidden'
			animate='visible'
			className='max-w-lg mx-auto space-y-0'
		>
			{/* Header */}
			<motion.div variants={slideUp} className='mb-6'>
				<div className='flex items-center gap-3 mb-1'>
					<div className='w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-eco-muted)] flex items-center justify-center border border-[var(--color-eco-light)]'>
						<Leaf size={18} className='text-[var(--color-eco)]' />
					</div>
					<div>
						<h1 className='text-xl font-bold font-[var(--font-display)] text-[var(--color-text-primary)]'>
							List Surplus Food
						</h1>
						<p className='text-xs text-[var(--color-text-muted)]'>
							Help NGOs rescue food from your event
						</p>
					</div>
				</div>
				<div className='flex gap-2 mt-3'>
					<Badge variant='eco' className='text-[10px]'>Free listing</Badge>
					<Badge variant='outline' className='text-[10px]'>NGO pickup</Badge>
					<Badge variant='outline' className='text-[10px]'>24h window</Badge>
				</div>
			</motion.div>

			{/* Step indicator */}
			<motion.div variants={fadeIn}>
				<StepIndicator currentStep={step} />
			</motion.div>

		{/* Step content */}
		<div className='min-h-[380px]'>
			{/* Hidden native file input — lives OUTSIDE AnimatePresence so the ref
			    is always attached to the DOM and .click() works reliably */}
			<input
				ref={fileInputRef}
				type='file'
				accept='image/jpeg,image/png,image/webp'
				multiple
				className='hidden'
				onChange={handleFileChange}
			/>
			<AnimatePresence mode='wait'>
				<motion.div
					key={step}
					initial={{ opacity: 0, x: 24 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -24 }}
					transition={{ duration: 0.2 }}
				>
					{step === 1 && <Step1 form={form} update={update} />}
					{step === 2 && <Step2 form={form} update={update} />}
					{step === 3 && <Step3 form={form} update={update} />}
					{step === 4 && (
						<Step4
							form={form}
							update={update}
							updateBool={updateBool}
							updateImages={updateImages}
							onSubmit={handleSubmit}
							submitting={submitting}
							submitError={submitError}
							onPickPhoto={pickPhoto}
							uploading={uploading}
							uploadError={uploadError}
						/>
					)}
				</motion.div>
			</AnimatePresence>
		</div>

			{/* Navigation */}
			{step < 4 && (
				<motion.div variants={slideUp} className='flex items-center justify-between pt-6 gap-3'>
					<Button
						variant='outline'
						onClick={handleBack}
						disabled={step === 1}
						className='gap-1.5 disabled:opacity-30'
					>
						<ChevronLeft size={16} />
						Back
					</Button>
					<Button
						onClick={handleNext}
						disabled={!canAdvance()}
						className='gap-1.5 flex-1 bg-[var(--color-brand-accent)] hover:bg-[var(--color-brand-accent-hover)] text-white disabled:opacity-40'
					>
						Continue
						<ChevronRight size={16} />
					</Button>
				</motion.div>
			)}

			<div className='h-6' />
		</motion.div>
	)
}
