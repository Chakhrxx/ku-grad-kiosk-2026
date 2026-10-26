import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Teach tailwind-merge our font-size and shadow tokens, or it misreads text-title / shadow-key as colors
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['title', 'subtitle', 'body', 'button', 'label'],
      shadow: ['glow', 'tile', 'carousel', 'card', 'key', 'key-pressed', 'key-primary', 'key-primary-pressed'],
    },
  },
})

/** Join class names; later Tailwind classes override earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
