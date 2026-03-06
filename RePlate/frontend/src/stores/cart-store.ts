import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, FoodItem } from '@/types'

interface CartState {
	items: CartItem[]
	totalItems: number
	totalAmount: number
	totalSavings: number
	totalCo2Saved: number

	addItem: (food: FoodItem, quantity?: number) => void
	removeItem: (itemId: string) => void
	updateQuantity: (itemId: string, quantity: number) => void
	clearCart: () => void
}

function recalculate(items: CartItem[]) {
	const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)
	const totalAmount = items.reduce((sum, i) => sum + i.subtotal, 0)
	const totalSavings = items.reduce(
		(sum, i) => sum + (i.foodItem.originalPrice - i.foodItem.discountedPrice) * i.quantity,
		0,
	)
	const totalCo2Saved = items.reduce(
		(sum, i) => sum + i.foodItem.co2SavedKg * i.quantity,
		0,
	)
	return { totalItems, totalAmount, totalSavings, totalCo2Saved }
}

export const useCartStore = create<CartState>()(
	persist(
		(set, get) => ({
			items: [],
			totalItems: 0,
			totalAmount: 0,
			totalSavings: 0,
			totalCo2Saved: 0,

			addItem: (food, quantity = 1) => {
				const existing = get().items.find((i) => i.foodItem.id === food.id)
				let newItems: CartItem[]
				if (existing) {
					newItems = get().items.map((i) =>
						i.foodItem.id === food.id
							? {
									...i,
									quantity: i.quantity + quantity,
									subtotal: (i.quantity + quantity) * food.discountedPrice,
								}
							: i,
					)
				} else {
					const newItem: CartItem = {
						id: `ci-${Date.now()}`,
						foodItem: food,
						quantity,
						subtotal: food.discountedPrice * quantity,
						pickupTime: food.pickupStart,
					}
					newItems = [...get().items, newItem]
				}
				set({ items: newItems, ...recalculate(newItems) })
			},

			removeItem: (itemId) => {
				const newItems = get().items.filter((i) => i.id !== itemId)
				set({ items: newItems, ...recalculate(newItems) })
			},

			updateQuantity: (itemId, quantity) => {
				if (quantity <= 0) {
					get().removeItem(itemId)
					return
				}
				const newItems = get().items.map((i) =>
					i.id === itemId
						? { ...i, quantity, subtotal: i.foodItem.discountedPrice * quantity }
						: i,
				)
				set({ items: newItems, ...recalculate(newItems) })
			},

			clearCart: () =>
				set({ items: [], totalItems: 0, totalAmount: 0, totalSavings: 0, totalCo2Saved: 0 }),
		}),
		{ name: 'replate-cart' },
	),
)
