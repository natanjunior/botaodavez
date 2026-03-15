// src/components/ui/segment-display.tsx
import { cn } from '@/lib/utils'

interface Props {
  value: string | number
  label?: string
  className?: string
}

export function SegmentDisplay({ value, label, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      {label && (
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
      <div className="bg-zinc-900 dark:bg-black px-3 py-1.5 rounded-md border border-zinc-700">
        <span
          className="font-mono text-green-400 tabular-nums"
          style={{ fontFamily: 'var(--font-mono-display)', letterSpacing: '0.15em' }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
