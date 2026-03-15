// src/components/ui/toggle-switch.tsx
'use client'
import { cn } from '@/lib/utils'

interface Props {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}

export function ToggleSwitch({ checked, onChange, label, className }: Props) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', className)}>
      <button
        role="switch"
        aria-checked={checked}
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors duration-200',
          'border-2 border-zinc-600',
          'shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]',
          checked ? 'bg-orange-500 border-orange-700' : 'bg-zinc-700 dark:bg-zinc-800'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full transition-transform duration-200',
            'bg-gradient-to-b from-zinc-200 to-zinc-400',
            'shadow-[0_2px_4px_rgba(0,0,0,0.5)]',
            checked ? 'translate-x-6' : 'translate-x-0.5'
          )}
        />
      </button>
      {label && (
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
    </label>
  )
}
