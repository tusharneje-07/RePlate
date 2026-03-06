import type { Variants, Easing } from 'motion/react'

const easeOut: Easing = 'easeOut'

export const fadeIn: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { duration: 0.2, ease: easeOut } },
}

export const slideUp: Variants = {
	hidden: { opacity: 0, y: 16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
}

export const slideDown: Variants = {
	hidden: { opacity: 0, y: -16 },
	visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: easeOut } },
}

export const slideInRight: Variants = {
	hidden: { opacity: 0, x: 24 },
	visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: easeOut } },
}

export const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.95 },
	visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.34, 1.56, 0.64, 1] } },
}

export const staggerContainer: Variants = {
	hidden: {},
	visible: {
		transition: {
			staggerChildren: 0.07,
			delayChildren: 0.05,
		},
	},
}

export const cardHover: Variants = {
	rest: { scale: 1, y: 0 },
	hover: { scale: 1.015, y: -2, transition: { duration: 0.2, ease: easeOut } },
}

export const defaultTransition = {
	duration: 0.2,
	ease: easeOut,
}

export const springTransition = {
	type: 'spring',
	stiffness: 400,
	damping: 30,
}
