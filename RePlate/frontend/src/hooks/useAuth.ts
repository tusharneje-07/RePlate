import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext'

/**
 * Access the auth context from any component inside <AuthProvider>.
 * Throws if used outside of AuthProvider.
 */
export function useAuth(): AuthContextValue {
	const ctx = useContext(AuthContext)
	if (!ctx) {
		throw new Error('useAuth must be used within an <AuthProvider>')
	}
	return ctx
}
