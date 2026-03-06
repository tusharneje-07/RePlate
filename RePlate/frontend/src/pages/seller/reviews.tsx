import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Star, MessageSquare, ChevronDown, ChevronUp, Send, ThumbsUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { staggerContainer, slideUp, fadeIn } from '@/lib/motion'
import { formatRelativeTime } from '@/lib/utils'
import { sellerApi } from '@/lib/api'
import { useSellerStore } from '@/stores/seller-store'
import { cn } from '@/lib/utils'
import type { SellerReview } from '@/types'

// ── Rating Star Row ──────────────────────────────────────────
function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
	return (
		<div className='flex items-center gap-0.5'>
			{Array.from({ length: max }).map((_, i) => (
				<Star
					key={i}
					size={13}
					className={cn(
						i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-[var(--color-seller-border)]',
					)}
				/>
			))}
		</div>
	)
}

// ── Rating Distribution Bar ──────────────────────────────────
function RatingBar({ star, count, total }: { star: number; count: number; total: number }) {
	const pct = total > 0 ? Math.round((count / total) * 100) : 0
	return (
		<div className='flex items-center gap-2'>
			<span className='text-xs text-[var(--color-seller-text-muted)] w-4 text-right'>{star}</span>
			<Star size={10} className='text-amber-400 fill-amber-400 flex-shrink-0' />
			<div className='flex-1 h-1.5 bg-[var(--color-seller-accent-muted)] rounded-full overflow-hidden'>
				<motion.div
					className='h-full bg-amber-400 rounded-full'
					initial={{ width: 0 }}
					animate={{ width: `${pct}%` }}
					transition={{ duration: 0.6, ease: 'easeOut', delay: (5 - star) * 0.07 }}
				/>
			</div>
			<span className='text-xs text-[var(--color-seller-text-muted)] w-5'>{count}</span>
		</div>
	)
}

// ── Review Card ──────────────────────────────────────────────
function ReviewCard({ review }: { review: SellerReview }) {
	const refreshReviews = useSellerStore((s) => s.refreshReviews)
	const [replyOpen, setReplyOpen] = useState(false)
	const [replyText, setReplyText] = useState('')
	const [submitted, setSubmitted] = useState(false)

	async function handleSubmitReply() {
		if (replyText.trim().length < 3) return
		try {
			await sellerApi.replyReview(review.id, replyText.trim())
			await refreshReviews()
			setSubmitted(true)
			setReplyOpen(false)
			setReplyText('')
		} catch {
			setSubmitted(false)
		}
	}

	const hasReply = !!review.sellerReply || submitted

	return (
		<motion.div variants={fadeIn}>
			<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
				<CardContent className='p-4'>
					{/* Header */}
					<div className='flex items-start gap-3 mb-3'>
						<Avatar className='w-9 h-9 flex-shrink-0'>
							{review.customerAvatar && <AvatarImage src={review.customerAvatar} alt={review.customerName} />}
							<AvatarFallback className='bg-[var(--color-seller-accent-muted)] text-[var(--color-seller-accent)] text-xs font-bold'>
								{review.customerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
							</AvatarFallback>
						</Avatar>
						<div className='flex-1 min-w-0'>
							<div className='flex items-center justify-between gap-2 flex-wrap'>
								<p className='text-sm font-semibold text-[var(--color-seller-text-primary)]'>{review.customerName}</p>
								<span className='text-[10px] text-[var(--color-seller-text-disabled)]'>
									{formatRelativeTime(new Date(review.createdAt))}
								</span>
							</div>
							<div className='flex items-center gap-2 mt-0.5'>
								<StarRow rating={review.rating} />
								<span className='text-[10px] text-[var(--color-seller-text-muted)]'>· {review.listingName}</span>
							</div>
						</div>
					</div>

					{/* Comment */}
					{review.comment && (
						<p className='text-sm text-[var(--color-seller-text-secondary)] leading-relaxed mb-3'>{review.comment}</p>
					)}

					{/* Seller Reply */}
					{review.sellerReply && (
						<div className='bg-[var(--color-seller-accent-light)] border border-[var(--color-seller-border-subtle)] rounded-[var(--radius-md)] p-3 mb-3'>
							<div className='flex items-center gap-1.5 mb-1.5'>
								<div className='w-4 h-4 rounded-full bg-[var(--color-seller-accent)] flex items-center justify-center'>
									<MessageSquare size={9} className='text-white' />
								</div>
								<span className='text-[11px] font-semibold text-[var(--color-seller-accent)]'>Your reply</span>
								{review.sellerRepliedAt && (
									<span className='text-[10px] text-[var(--color-seller-text-disabled)] ml-auto'>
										{formatRelativeTime(new Date(review.sellerRepliedAt))}
									</span>
								)}
							</div>
							<p className='text-xs text-[var(--color-seller-text-secondary)] leading-relaxed'>{review.sellerReply}</p>
						</div>
					)}

					{/* Submitted mock reply */}
					{submitted && !review.sellerReply && (
						<div className='bg-[var(--color-seller-eco-muted)] border border-[var(--color-seller-eco-light)] rounded-[var(--radius-md)] p-3 mb-3'>
							<div className='flex items-center gap-1.5 mb-1'>
								<ThumbsUp size={11} className='text-[#2d8a4e]' />
								<span className='text-[11px] font-semibold text-[#2d8a4e]'>Reply submitted</span>
							</div>
							<p className='text-xs text-[var(--color-seller-text-secondary)]'>Your reply is now visible to customers.</p>
						</div>
					)}

					{/* Reply toggle */}
					{!hasReply && (
						<div>
							<button
								onClick={() => setReplyOpen((o) => !o)}
								className='flex items-center gap-1 text-xs text-[var(--color-seller-accent)] font-medium hover:underline transition-all'
							>
								<MessageSquare size={12} />
								{replyOpen ? 'Close' : 'Reply to review'}
								{replyOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
							</button>

							<AnimatePresence>
								{replyOpen && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.2 }}
										className='overflow-hidden'
									>
										<div className='mt-3 space-y-2'>
											<textarea
												rows={3}
												value={replyText}
												onChange={(e) => setReplyText(e.target.value)}
												placeholder='Write a thoughtful reply to this review...'
												className='w-full text-sm px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-seller-border)] bg-white text-[var(--color-seller-text-primary)] placeholder:text-[var(--color-seller-text-disabled)] resize-none focus:outline-none focus:border-[var(--color-seller-accent)] focus:ring-1 focus:ring-[var(--color-seller-accent)]'
											/>
											<div className='flex items-center justify-between'>
												<span className='text-[10px] text-[var(--color-seller-text-disabled)]'>
													{replyText.length}/300 chars
												</span>
												<button
													onClick={handleSubmitReply}
													disabled={replyText.trim().length < 3}
													className={cn(
														'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all',
														replyText.trim().length >= 3
															? 'bg-[var(--color-seller-accent)] text-white hover:bg-[var(--color-seller-accent-hover)]'
															: 'bg-[var(--color-seller-border-subtle)] text-[var(--color-seller-text-disabled)] cursor-not-allowed',
													)}
												>
													<Send size={11} />
													Submit Reply
												</button>
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					)}
				</CardContent>
			</Card>
		</motion.div>
	)
}

// ── Main Page ─────────────────────────────────────────────────
export function SellerReviewsPage() {
	const reviews = useSellerStore((s) => s.reviews)
	const profile = useSellerStore((s) => s.profile)

	if (!profile) {
		return <div className='py-10 text-center text-sm text-[var(--color-seller-text-muted)]'>Loading reviews...</div>
	}

	// Compute distribution
	const distribution = [5, 4, 3, 2, 1].map((star) => ({
		star,
		count: reviews.filter((r) => r.rating === star).length,
	}))
	const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

	// Filter state
	const [filter, setFilter] = useState<number | 'all'>('all')
	const filtered = filter === 'all' ? reviews : reviews.filter((r) => r.rating === filter)

	return (
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
						Reviews
					</h1>
					<p className='text-sm text-[var(--color-seller-text-muted)] mt-0.5'>
						{reviews.length} review{reviews.length !== 1 ? 's' : ''} from customers
					</p>
				</div>
				<Badge className='bg-amber-50 text-amber-700 border border-amber-200 text-sm font-bold gap-1 px-3 py-1'>
					<Star size={13} className='fill-amber-400 text-amber-400' />
					{profile.rating}
				</Badge>
			</motion.div>

			{/* ── Rating Summary Card ── */}
			<motion.div variants={slideUp}>
				<Card className='border-[var(--color-seller-border)] shadow-none overflow-hidden'>
					<CardContent className='p-4'>
						<div className='flex items-start gap-5'>
							{/* Big number */}
							<div className='text-center flex-shrink-0'>
								<p className='text-5xl font-bold font-[var(--font-display)] text-[var(--color-seller-text-primary)] leading-none'>
									{avgRating.toFixed(1)}
								</p>
								<StarRow rating={avgRating} />
								<p className='text-[10px] text-[var(--color-seller-text-muted)] mt-1'>
									{profile.reviewCount} ratings
								</p>
							</div>
							{/* Bars */}
							<div className='flex-1 space-y-1.5'>
								{distribution.map((d) => (
									<RatingBar key={d.star} star={d.star} count={d.count} total={reviews.length} />
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</motion.div>

			{/* ── Filter Pills ── */}
			<motion.div variants={fadeIn} className='flex items-center gap-2 overflow-x-auto no-scrollbar pb-1'>
				{(['all', 5, 4, 3, 2, 1] as const).map((f) => {
					const count = f === 'all' ? reviews.length : reviews.filter((r) => r.rating === f).length
					return (
						<button
							key={f}
							onClick={() => setFilter(f)}
							className={cn(
								'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border',
								filter === f
									? 'bg-[var(--color-seller-accent)] text-white border-[var(--color-seller-accent)]'
									: 'bg-white text-[var(--color-seller-text-secondary)] border-[var(--color-seller-border)] hover:border-[var(--color-seller-accent)]',
							)}
						>
							{f === 'all' ? (
								'All'
							) : (
								<>
									{f} <Star size={10} className='fill-current' />
								</>
							)}
							<span
								className={cn(
									'rounded-full px-1.5 text-[10px]',
									filter === f ? 'bg-white/20' : 'bg-[var(--color-seller-border-subtle)]',
								)}
							>
								{count}
							</span>
						</button>
					)
				})}
			</motion.div>

			{/* ── Review Cards ── */}
			<motion.div variants={staggerContainer} className='space-y-3'>
				<AnimatePresence mode='popLayout'>
					{filtered.length > 0 ? (
						filtered.map((review) => <ReviewCard key={review.id} review={review} />)
					) : (
						<motion.div
							key='empty'
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className='text-center py-16'
						>
							<Star size={36} className='mx-auto text-[var(--color-seller-border)] mb-3' />
							<p className='text-sm text-[var(--color-seller-text-muted)]'>No {filter}-star reviews yet.</p>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>
		</motion.div>
	)
}
