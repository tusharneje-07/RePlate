import { ShieldCheck, BadgeCheck, Phone, Mail, MapPin, Building2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useInspectorStore } from '@/stores/inspector-store'

export function InspectorProfilePage() {
	const { profile } = useInspectorStore()

	return (
		<div className='space-y-4 px-4 md:px-6 pt-6 pb-8 max-w-5xl mx-auto'>
			<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
				<CardContent className='p-5'>
					<div className='flex flex-col sm:flex-row sm:items-center gap-4'>
						<Avatar className='w-20 h-20 ring-2 ring-[var(--color-inspector-accent)]/20'>
							<AvatarImage src={profile.avatar} alt={profile.name} />
							<AvatarFallback className='bg-[var(--color-inspector-secondary)] text-[var(--color-inspector-accent)] font-bold'>
								{profile.name.split(' ').map((n) => n[0]).join('')}
							</AvatarFallback>
						</Avatar>
						<div className='min-w-0'>
							<div className='flex items-center gap-2 flex-wrap'>
								<h1 className='text-2xl font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>{profile.name}</h1>
								<ShieldCheck className='w-5 h-5 text-[var(--color-inspector-accent)]' />
							</div>
							<p className='text-sm text-[var(--color-inspector-text-muted)] mt-1'>{profile.verificationAuthority}</p>
							<div className='flex items-center gap-2 mt-2 flex-wrap'>
								<Badge className='border-none bg-[var(--color-inspector-accent-light)] text-[var(--color-inspector-accent)] text-xs hover:bg-[var(--color-inspector-accent-light)]'>
									{profile.authorityLevel.replace('_', ' ')}
								</Badge>
								<Badge className='border-none bg-[var(--color-inspector-risk-low-light)] text-[var(--color-inspector-risk-low)] text-xs hover:bg-[var(--color-inspector-risk-low-light)]'>
									{profile.availabilityStatus.replace('_', ' ')}
								</Badge>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4 space-y-3'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)]'>Inspector Identity</h3>
						<div className='space-y-2 text-sm'>
							<p className='flex items-center gap-2 text-[var(--color-inspector-text-secondary)]'><BadgeCheck className='w-4 h-4 text-[var(--color-inspector-accent)]' /> Certification ID: <span className='font-semibold'>{profile.certificationId}</span></p>
							<p className='flex items-center gap-2 text-[var(--color-inspector-text-secondary)]'><Mail className='w-4 h-4 text-[var(--color-inspector-accent)]' /> {profile.email}</p>
							<p className='flex items-center gap-2 text-[var(--color-inspector-text-secondary)]'><Phone className='w-4 h-4 text-[var(--color-inspector-accent)]' /> {profile.phone}</p>
							<p className='flex items-center gap-2 text-[var(--color-inspector-text-secondary)]'><Building2 className='w-4 h-4 text-[var(--color-inspector-accent)]' /> {profile.headquarters}</p>
						</div>
					</CardContent>
				</Card>

				<Card className='border-[var(--color-inspector-border)] bg-[var(--color-inspector-surface)] shadow-none'>
					<CardContent className='p-4'>
						<h3 className='text-sm font-bold font-[var(--font-display)] text-[var(--color-inspector-text-primary)] mb-3'>Assigned Regions</h3>
						<div className='flex flex-wrap gap-2'>
							{profile.assignedRegions.map((region) => (
								<Badge key={region} className='border border-[var(--color-inspector-border-subtle)] bg-[var(--color-inspector-surface-elevated)] text-[var(--color-inspector-text-secondary)] hover:bg-[var(--color-inspector-surface-elevated)]'>
									<MapPin className='w-3.5 h-3.5 mr-1' /> {region}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
