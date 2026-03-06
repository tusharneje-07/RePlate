import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Leaf, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import type { TokenPayload } from '@/lib/api'

/**
 * /auth/callback
 *
 * The backend redirects here with the JWT in the URL fragment:
 *   /auth/callback#token=<jwt>&redirect=<path>
 *
 * This page:
 *  1. Reads the fragment
 *  2. Stores the token via login()
 *  3. Inspects the decoded payload + loaded user to decide where to navigate:
 *     - no role  → /auth/select-role
 *     - has role but not onboarded → /<role>/onboarding
 *     - has role + onboarded → /<role>/dashboard (or ?redirect param)
 */
export function AuthCallbackPage() {
	const { login } = useAuth()
	const navigate = useNavigate()
	const [error, setError] = useState<string | null>(null)
	const processed = useRef(false)

	useEffect(() => {
		if (processed.current) return
		processed.current = true

		async function handle() {
			const hash = window.location.hash.slice(1) // strip leading '#'
			const params = new URLSearchParams(hash)

			const token = params.get('token')

			if (!token) {
				setError('No authentication token received. Please try signing in again.')
				return
			}

			try {
				const payload: TokenPayload = await login(token)
				// login() calls loadUser() which populates AuthContext.user — but React state
				// updates are async, so we derive the destination from the JWT payload directly
				// and use the backend redirect hint only as a cross-check.

				if (!payload.role) {
					// Brand-new account: no role assigned yet
					navigate('/auth/select-role', { replace: true })
					return
				}

				const rolePath = payload.role.toLowerCase()

				// We can't read the updated `user` state synchronously after login(),
				// so we call /auth/me ourselves via the already-stored token to get
				// the freshest is_onboarded value.
				const { authApi } = await import('@/lib/api')
				const meRes = await authApi.me()
				const isOnboarded = meRes.data.is_onboarded

				if (!isOnboarded) {
					navigate(`/${rolePath}/onboarding`, { replace: true })
				} else {
					navigate(`/${rolePath}/dashboard`, { replace: true })
				}
			} catch {
				setError('Failed to complete sign-in. Please try again.')
			}
		}

		handle()
	}, [login, navigate])

	return (
		<div className='min-h-dvh bg-[var(--color-brand-primary)] flex items-center justify-center px-4'>
			<motion.div
				initial={{ opacity: 0, scale: 0.97 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
				className='flex flex-col items-center gap-5 text-center max-w-xs'
			>
				{/* Logo */}
				<div className='w-12 h-12 rounded-2xl bg-[var(--color-brand-accent)] flex items-center justify-center shadow-[var(--shadow-elevated)]'>
					<Leaf size={22} className='text-white' />
				</div>

				{error ? (
					<>
						<div className='flex items-start gap-2.5 p-3.5 rounded-[var(--radius-lg)] bg-[var(--color-error-light)] border border-red-200 text-left'>
							<AlertCircle size={16} className='text-[var(--color-error)] flex-shrink-0 mt-0.5' />
							<p className='text-sm text-[var(--color-error)]'>{error}</p>
						</div>
						<button
							onClick={() => navigate('/auth/login', { replace: true })}
							className='h-10 px-6 rounded-[var(--radius-full)] bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-accent-hover)] transition-colors'
						>
							Back to sign in
						</button>
					</>
				) : (
					<>
						<Loader2 size={24} className='animate-spin text-[var(--color-brand-accent)]' />
						<div className='space-y-1'>
							<p className='text-sm font-semibold text-[var(--color-text-primary)]'>Completing sign-in…</p>
							<p className='text-xs text-[var(--color-text-muted)]'>You will be redirected in a moment.</p>
						</div>
					</>
				)}
			</motion.div>
		</div>
	)
}
