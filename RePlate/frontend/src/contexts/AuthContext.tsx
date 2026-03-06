import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authApi, decodeToken, getToken, isTokenExpired, removeToken, setToken, type MeResponse, type TokenPayload } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────
export type UserRole = 'CONSUMER' | 'SELLER' | 'NGO' | 'INSPECTOR' | 'ADMIN'

export interface AuthUser {
	id: string
	email: string
	firstName: string | null
	lastName: string | null
	role: UserRole | null
	profilePictureUrl: string | null
	isOnboarded: boolean
}

export interface AuthContextValue {
	/** The authenticated user, or null if not logged in. */
	user: AuthUser | null
	/** True while we are resolving the initial auth state. */
	isLoading: boolean
	/** True when the user is authenticated (token + user fetched). */
	isAuthenticated: boolean
	/**
	 * Store a new JWT (e.g. after callback) and load the user profile.
	 * Returns the decoded payload so the caller can decide where to redirect.
	 */
	login: (token: string) => Promise<TokenPayload>
	/**
	 * Update the stored token (e.g. after role assignment returns a new one)
	 * and refresh the user profile.
	 */
	refreshToken: (token: string) => Promise<void>
	/**
	 * Re-fetch /auth/me and update the in-memory user without changing the token.
	 * Use after operations that mutate server-side user state (e.g. onboarding complete).
	 */
	refreshUser: () => Promise<void>
	/** Clear the session and redirect to /auth/login. */
	logout: () => Promise<void>
	/**
	 * Permanently delete the account from WorkOS + local DB,
	 * then clear all local state, cookies, and localStorage and redirect to /auth/login.
	 */
	deleteAccount: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────
export const AuthContext = createContext<AuthContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<AuthUser | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	// Map the API response to our local shape
	function mapUser(data: MeResponse): AuthUser {
		return {
			id: data.id,
			email: data.email,
			firstName: data.first_name,
			lastName: data.last_name,
			role: data.role as UserRole | null,
			profilePictureUrl: data.profile_picture_url,
			isOnboarded: data.is_onboarded,
		}
	}

	// Fetch /auth/me and set user state
	const loadUser = useCallback(async () => {
		try {
			const { data } = await authApi.me()
			setUser(mapUser(data))
		} catch {
			setUser(null)
			removeToken()
		}
	}, [])

	// On mount: check if there is a valid token and load the user
	useEffect(() => {
		const token = getToken()
		if (token && !isTokenExpired(token)) {
			loadUser().finally(() => setIsLoading(false))
		} else {
			if (token) removeToken() // remove expired token
			setIsLoading(false)
		}
	}, [loadUser])

	const login = useCallback(
		async (token: string): Promise<TokenPayload> => {
			setToken(token)
			const payload = decodeToken(token) as unknown as TokenPayload
			await loadUser()
			return payload
		},
		[loadUser],
	)

	const refreshToken = useCallback(
		async (token: string): Promise<void> => {
			setToken(token)
			await loadUser()
		},
		[loadUser],
	)

	const refreshUser = useCallback(async (): Promise<void> => {
		await loadUser()
	}, [loadUser])

	const logout = useCallback(async (): Promise<void> => {
		try {
			await authApi.signOut()
		} catch {
			// swallow — sign out on client regardless
		} finally {
			removeToken()
			setUser(null)
			window.location.href = '/auth/login'
		}
	}, [])

	const deleteAccount = useCallback(async (): Promise<void> => {
		// Call backend — deletes from WorkOS + DB
		await authApi.deleteAccount()
		// Clear JWT from localStorage
		removeToken()
		// Clear all cookies (document.cookie approach clears same-origin cookies)
		document.cookie.split(';').forEach((cookie) => {
			const name = cookie.split('=')[0].trim()
			document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
		})
		// Clear all localStorage (removes location store, cart, etc.)
		localStorage.clear()
		// Clear sessionStorage too
		sessionStorage.clear()
		setUser(null)
		window.location.href = '/auth/login'
	}, [])

	const value = useMemo<AuthContextValue>(
		() => ({
			user,
			isLoading,
			isAuthenticated: !!user,
			login,
			refreshToken,
			refreshUser,
			logout,
			deleteAccount,
		}),
		[user, isLoading, login, refreshToken, refreshUser, logout, deleteAccount],
	)

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
