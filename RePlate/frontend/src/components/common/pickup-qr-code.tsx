import { QRCodeSVG } from 'qrcode.react'
import { CheckCircle2, Clock, QrCode } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/types'

interface PickupQRCodeProps {
	order: Order
}

export function PickupQRCode({ order }: PickupQRCodeProps) {
	const isReady = order.status === 'ready_for_pickup'
	const hasQrCode = !!order.qrCode

	return (
		<div className='flex flex-col items-center gap-4 p-5 bg-[var(--color-surface-card)] rounded-[var(--radius-xl)] border border-[var(--color-border)] shadow-[var(--shadow-card)]'>
			{isReady ? (
				<Badge variant='success' className='gap-1.5 text-sm px-3 py-1'>
					<CheckCircle2 size={14} />
					Ready for Pickup
				</Badge>
			) : (
				<Badge variant='muted' className='gap-1.5 text-sm px-3 py-1'>
					<Clock size={14} />
					Not ready yet — QR ready to scan
				</Badge>
			)}

			{/* QR Code */}
			<div
				className={`relative w-52 h-52 rounded-[var(--radius-lg)] overflow-hidden flex items-center justify-center bg-white ${
					isReady
						? 'border-2 border-[var(--color-brand-accent)]'
						: 'border-2 border-dashed border-[var(--color-border)]'
				}`}
			>
				{hasQrCode ? (
					<QRCodeSVG
						value={order.qrCode!}
						size={184}
						level='M'
						includeMargin={false}
						fgColor='#111111'
						bgColor='#ffffff'
					/>
				) : (
					<div className='text-center px-4'>
						<QrCode size={48} className='text-[var(--color-border)] mx-auto mb-2' />
						<p className='text-xs text-[var(--color-text-muted)]'>QR code not available</p>
					</div>
				)}
			</div>

			{/* Order code */}
			{hasQrCode && (
				<div className='text-center'>
					<p className='text-xs text-[var(--color-text-muted)] mb-1'>Order Code</p>
					<p className='font-mono font-bold text-sm text-[var(--color-text-primary)] tracking-widest'>
						{order.qrCode}
					</p>
				</div>
			)}

			{/* Pickup info */}
			<div className='w-full pt-3 border-t border-[var(--color-border)] text-center'>
				<p className='text-xs text-[var(--color-text-muted)]'>Pickup at</p>
				<p className='text-sm font-medium text-[var(--color-text-primary)] mt-0.5'>{order.seller.name}</p>
				<p className='text-xs text-[var(--color-text-muted)]'>{order.pickupAddress}</p>
			</div>
		</div>
	)
}
