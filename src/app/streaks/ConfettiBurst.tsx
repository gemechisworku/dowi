import { useMemo, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

const COLORS = [
  'var(--color-primary)',
  'var(--blue-300)',
  'var(--color-income)',
  'var(--color-warning)',
  '#f472b6',
]
const PIECE_COUNT = 28

interface Piece {
  left: number
  delayMs: number
  durationMs: number
  color: string
  rotateDeg: number
  drift: number
}

function buildPieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * 100,
    delayMs: Math.random() * 400,
    durationMs: 1400 + Math.random() * 900,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
    rotateDeg: Math.random() * 360,
    drift: (Math.random() - 0.5) * 60,
  }))
}

/**
 * Pure CSS confetti (no animation library — matches the project's existing
 * "no new dependency for a visual" pattern from the own-SVG charts). Falls
 * once per mount; `prefers-reduced-motion` disables the fall/spin entirely
 * via the `@keyframes`/`animation` rule in `src/styles/index.css`, leaving
 * the celebration dialog's text as the only feedback.
 */
export function ConfettiBurst({ active }: { active: boolean }) {
  const pieces = useMemo(() => (active ? buildPieces() : []), [active])
  if (!active) return null

  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 'var(--z-toast)' }}
    >
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="dowi-confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `${piece.delayMs}ms`,
              animationDuration: `${piece.durationMs}ms`,
              '--confetti-rotate': `${piece.rotateDeg}deg`,
              '--confetti-drift': `${piece.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  )
}
