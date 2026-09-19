export interface SparklineProps {
  title: string
  values: number[]
  color?: string
  height?: number
  width?: number
}

/** A minimal trend line — e.g. net balance over the last N periods on Home. */
export function Sparkline({
  title,
  values,
  color = 'var(--color-primary)',
  height = 32,
  width = 100,
}: SparklineProps) {
  if (values.length === 0) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const step = width / Math.max(1, values.length - 1)

  const points = values
    .map((v, i) => `${i * step},${height - ((v - min) / range) * height}`)
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={title}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
