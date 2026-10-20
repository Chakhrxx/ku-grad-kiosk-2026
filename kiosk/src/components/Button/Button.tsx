import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const variants = {
  // A 3D teal key that sinks when pressed; flat and pale while disabled
  primary: cn(
    'w-68 bg-linear-to-b from-[#0f8a83] to-primary text-on-primary',
    'shadow-key-primary transition-[translate,box-shadow] duration-100',
    'active:translate-y-1.5 active:shadow-key-primary-pressed',
    'disabled:translate-y-0 disabled:cursor-default disabled:bg-none disabled:bg-primary-soft disabled:text-disabled-label disabled:shadow-none',
  ),
  secondary: 'w-46.75 bg-primary-soft text-primary shadow-glow',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = filled teal CTA (NEXT, Tap to start); secondary = pale fill (RETAKE, HOME). */
  variant?: keyof typeof variants
}

export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('h-12.75 rounded-pill text-button font-semibold', variants[variant], className)}
      {...props}
    />
  )
}
