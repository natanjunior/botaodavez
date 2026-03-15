// src/components/game/game-button.tsx
'use client'
import { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { ButtonState } from '@/types'

const STATE_CONFIG: Record<ButtonState, {
  bg: string
  shadow: string
  label: string
  animate: string
  textColor: string
}> = {
  disabled: {
    bg: 'bg-zinc-700 dark:bg-zinc-800',
    shadow: 'shadow-[0_8px_0_#111,inset_0_2px_4px_rgba(255,255,255,0.05)]',
    label: 'AGUARDE',
    animate: '',
    textColor: 'text-zinc-500',
  },
  yellow: {
    bg: 'bg-yellow-400',
    shadow: '[animation:yellow-pulse_1.2s_ease-in-out_infinite]',
    label: 'ATENÇÃO!',
    animate: '',
    textColor: 'text-yellow-900',
  },
  green: {
    bg: 'bg-green-400',
    shadow: '[animation:glow-pulse_0.8s_ease-in-out_infinite]',
    label: 'VAI!',
    animate: '',
    textColor: 'text-green-900',
  },
  red: {
    bg: 'bg-red-700',
    shadow: 'shadow-[0_2px_0_#450a0a,inset_0_6px_12px_rgba(0,0,0,0.5)]',
    label: 'ELIMINADO',
    animate: '',
    textColor: 'text-red-200',
  },
  winner: {
    bg: 'bg-gradient-to-br from-yellow-300 via-green-400 to-emerald-400',
    shadow: 'shadow-[0_8px_0_#166534,0_0_60px_rgba(74,222,128,0.6),inset_0_2px_8px_rgba(255,255,255,0.4)]',
    label: 'VENCEDOR!',
    animate: '',
    textColor: 'text-emerald-900',
  },
  loser: {
    bg: 'bg-zinc-600 dark:bg-zinc-700',
    shadow: 'shadow-[0_4px_0_#111,inset_0_2px_4px_rgba(0,0,0,0.4)]',
    label: 'PERDEU',
    animate: '',
    textColor: 'text-zinc-400',
  },
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  state: ButtonState
  reactionTimeMs?: number | null
}

export function GameButton({ state, reactionTimeMs, className, ...props }: Props) {
  const config = STATE_CONFIG[state]
  const isInteractive = state === 'yellow' || state === 'green'

  return (
    <button
      disabled={!isInteractive}
      className={cn(
        'relative w-64 h-64 rounded-full select-none',
        'transition-all duration-150',
        'border-[6px] border-zinc-900/40',
        config.bg,
        config.shadow,
        config.animate,
        isInteractive && 'active:translate-y-2 cursor-pointer',
        !isInteractive && 'cursor-default',
        className
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-2">
        <span className={cn('font-mono text-2xl font-bold tracking-widest uppercase', config.textColor)}>
          {config.label}
        </span>
        {reactionTimeMs != null && (
          <span className={cn('font-mono text-sm', config.textColor)}>
            {reactionTimeMs}ms
          </span>
        )}
      </div>
    </button>
  )
}
