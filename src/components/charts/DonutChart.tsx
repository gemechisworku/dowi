import { ChartDataTable } from './ChartDataTable'

export interface DonutSlice {
  label: string
  value: number
  color: string
}

export interface DonutChartProps {
  title: string
  data: DonutSlice[]
  size?: number
  /** Content rendered in the centre hole, e.g. the total. */
  centerLabel?: string
}

/** The category breakdown donut (PRD §5.4). */
export function DonutChart({ title, data, size = 120, centerLabel }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = 40
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          role="img"
          aria-label={title}
          className="-rotate-90"
        >
          {total === 0 ? (
            <circle
              cx={50}
              cy={50}
              r={radius}
              fill="none"
              stroke="var(--color-surface-2)"
              strokeWidth={14}
            />
          ) : (
            data.map((slice) => {
              const fraction = slice.value / total
              const dash = fraction * circumference
              const gap = circumference - dash
              const offset = -cumulative * circumference
              cumulative += fraction
              return (
                <circle
                  key={slice.label}
                  cx={50}
                  cy={50}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={14}
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={offset}
                />
              )
            })
          )}
        </svg>
        {centerLabel && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm font-bold"
            style={{ color: 'var(--color-text)' }}
          >
            {centerLabel}
          </div>
        )}
      </div>
      <ul className="flex-1 space-y-1.5">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: slice.color }}
              />
              <span className="truncate" style={{ color: 'var(--color-text)' }}>
                {slice.label}
              </span>
            </span>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {total > 0 ? Math.round((slice.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
      <ChartDataTable
        caption={title}
        columns={['Category', 'Value', 'Share']}
        rows={data.map((d) => [
          d.label,
          d.value,
          total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%',
        ])}
      />
    </div>
  )
}
