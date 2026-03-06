export const queryKeys = {
	// Food listings
	food: {
		all: ['food'] as const,
		nearby: (lat: number, lng: number) => ['food', 'nearby', lat, lng] as const,
		browse: (filters: Record<string, unknown>) => ['food', 'browse', filters] as const,
		detail: (id: string) => ['food', id] as const,
		recommendations: (userId: string) => ['food', 'recommendations', userId] as const,
	},
	// Sellers
	sellers: {
		all: ['sellers'] as const,
		nearby: (lat: number, lng: number) => ['sellers', 'nearby', lat, lng] as const,
		detail: (id: string) => ['sellers', id] as const,
		featured: ['sellers', 'featured'] as const,
	},
	// Cart
	cart: {
		all: ['cart'] as const,
		summary: ['cart', 'summary'] as const,
	},
	// Orders
	orders: {
		all: ['orders'] as const,
		list: (status?: string) => ['orders', 'list', status] as const,
		detail: (id: string) => ['orders', id] as const,
	},
	// Favorites
	favorites: {
		all: ['favorites'] as const,
		food: ['favorites', 'food'] as const,
		sellers: ['favorites', 'sellers'] as const,
	},
	// User
	user: {
		profile: ['user', 'profile'] as const,
		impact: ['user', 'impact'] as const,
		notifications: ['user', 'notifications'] as const,
	},
	// Weather
	weather: {
		current: (lat: number, lng: number) => ['weather', lat, lng] as const,
	},
} as const
