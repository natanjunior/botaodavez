// src/components/ui/game-token-display.tsx
import { SegmentDisplay } from './segment-display'

interface Props {
  token: string
}

export function GameTokenDisplay({ token }: Props) {
  return <SegmentDisplay value={token} label="Código do game" />
}
