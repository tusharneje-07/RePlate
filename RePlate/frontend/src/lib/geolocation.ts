/**
 * Permission-aware geolocation utility.
 *
 * The browser only shows the permission prompt when the state is "prompt".
 * If permission is already "denied", calling watchPosition/getCurrentPosition
 * silently errors without re-prompting. This helper checks the permission state
 * first and returns a human-readable error immediately when denied, so the UI
 * can show actionable instructions instead of a confusing silent failure.
 */

export interface GeoSuccess {
	ok: true
	lat: number
	lng: number
}

export interface GeoFailure {
	ok: false
	/** Human-readable reason — show this directly to the user */
	message: string
}

export type GeoResult = GeoSuccess | GeoFailure

const DENIED_MESSAGE =
	'Location permission is blocked. To fix: click the lock icon in your browser address bar → Site settings → Location → Allow, then try again.'

const UNAVAILABLE_MESSAGE =
	'Unable to retrieve your location. Please pin it manually on the map.'

/**
 * Requests the current position using watchPosition (forces a fresh hardware fix).
 * Checks the Permissions API first — if already denied, returns the error immediately
 * without making a geolocation call (which would silently fail with no prompt).
 */
export async function requestPosition(options?: PositionOptions): Promise<GeoResult> {
	if (!navigator.geolocation) {
		return { ok: false, message: 'Geolocation is not supported by your browser.' }
	}

	// Check permission state before calling geolocation API.
	// "denied" → can't re-prompt, must guide user to browser settings.
	// "prompt" → the geolocation call itself will trigger the browser dialog.
	// "granted" → proceed directly.
	try {
		const status = await navigator.permissions.query({ name: 'geolocation' })
		if (status.state === 'denied') {
			return { ok: false, message: DENIED_MESSAGE }
		}
	} catch {
		// Permissions API not available in this browser — proceed anyway.
	}

	return new Promise((resolve) => {
		let resolved = false
		const watchId = navigator.geolocation.watchPosition(
			(pos) => {
				if (resolved) return
				resolved = true
				navigator.geolocation.clearWatch(watchId)
				resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude })
			},
			(err) => {
				if (resolved) return
				resolved = true
				navigator.geolocation.clearWatch(watchId)
				resolve({
					ok: false,
					message: err.code === err.PERMISSION_DENIED ? DENIED_MESSAGE : UNAVAILABLE_MESSAGE,
				})
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options },
		)
	})
}
