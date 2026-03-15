// src/components/ui/panel-section.tsx
import { cn } from '@/lib/utils'

interface Props {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PanelSection({ title, children, className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl p-4',
        'bg-[#e8e8e8] dark:bg-[#2a2a2a]',
        'border border-zinc-300 dark:border-zinc-700',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.1)]',
        'dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.3)]',
        className
      )}
    >
      {title && (
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}
