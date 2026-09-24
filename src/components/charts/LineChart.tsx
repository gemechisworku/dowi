import { ChartDataTable } from './ChartDataTable'
import { ChartScrollContainer } from './ChartScrollContainer'
import { CHART_LABEL_FONT_SIZE, computeChartWidth, truncateLabel } from './chartLayout'

export interface LineChartSeries {
  label: string
  color: string
  values: number[]
}

export interface LineChartProps {
  title: string
  /** Shared x-axis, one entry per data point — every series' `values` must match this length. */
  labels: string[]
  series: LineChartSeries[]
  height?: number
}

/** A multi-series line chart, e.g. expense trend across a period's sub-periods, or a category trend across periods. */
export function LineChart({ title, labels, series, height = 96 }: LineChartProps) {
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const width = computeChartWidth(labels.length)
  const chartHeight = height - 16
  const step = labels.length > 1 ? width / (labels.length - 1) : 0
  const xFor = (i: number) => (labels.length > 1 ? i * step : width / 2)
  const yFor = (value: number) => chartHeight - (value / max) * (chartHeight - 4)

  return (
    <div>
      <ChartScrollContainer>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="img"
          aria-label={title}
        >
          {series.map((s) => (
            <g key={s.label}>
              <polyline
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ')}
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={2.5} fill={s.color} />
              ))}
            </g>
          ))}
          {labels.map((label, i) => (
            <text
              key={label + i}
              x={xFor(i)}
              y={height - 4}
              fontSize={CHART_LABEL_FONT_SIZE}
              textAnchor="middle"
              fill="var(--color-text-muted)"
            >
              <title>{label}</title>
              {truncateLabel(label)}
            </text>
          ))}
        </svg>
      </ChartScrollContainer>
      {series.length > 1 && (
        <div
          className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {series.map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      <ChartDataTable
        caption={title}
        columns={['Period', ...series.map((s) => s.label)]}
        rows={labels.map((label, i) => [label, ...series.map((s) => s.values[i] ?? 0)])}
      />
    </div>
  )
}
