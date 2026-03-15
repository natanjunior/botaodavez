// src/components/ui/led-indicator.tsx
import { cn } from '@/lib/utils'

type LEDColor = 'green' | 'red' | 'yellow' | 'orange' | 'off'

const colorMap: Record<LEDColor, string> = {
  green: 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]',
  red: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]',
  yellow: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.8)]',
  orange: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]',
  off: 'bg-zinc-600 dark:bg-zinc-700',
}

interface Props {
  color: LEDColor
  size?: 'sm' | 'md'
  className?: string
}

export function LEDIndicator({ color, size = 'sm', className }: Props) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        size === 'sm' && 'w-2 h-2',
        size === 'md' && 'w-3 h-3',
        colorMap[color],
        className
      )}
    />
  )
}
