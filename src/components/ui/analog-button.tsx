// src/components/ui/analog-button.tsx
'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const AnalogButton = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'secondary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'relative font-mono uppercase tracking-widest select-none',
          'rounded-lg border-b-4 transition-all duration-100',
          'active:border-b-0 active:translate-y-[3px]',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          size === 'sm' && 'px-3 py-1.5 text-xs',
          size === 'md' && 'px-5 py-2.5 text-sm',
          size === 'lg' && 'px-8 py-4 text-base',
          variant === 'primary' && [
            'bg-gradient-to-b from-orange-500 to-orange-600 border-orange-800 text-white',
            'shadow-[inset_0_1px_0_theme(colors.orange.400)]',
          ],
          variant === 'secondary' && [
            'bg-gradient-to-b from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700',
            'border-zinc-600 dark:border-zinc-900 text-zinc-800 dark:text-zinc-200',
            'shadow-[inset_0_1px_0_theme(colors.zinc.200)] dark:shadow-[inset_0_1px_0_theme(colors.zinc.500)]',
          ],
          variant === 'danger' && [
            'bg-gradient-to-b from-red-500 to-red-600 border-red-800 text-white',
            'shadow-[inset_0_1px_0_theme(colors.red.400)]',
          ],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
AnalogButton.displayName = 'AnalogButton'
