import { ChartDataTable } from './ChartDataTable'
import { ChartScrollContainer } from './ChartScrollContainer'
import { CHART_LABEL_FONT_SIZE, computeChartWidth, truncateLabel } from './chartLayout'

export interface BarChartDatum {
  label: string
  value: number
}

export interface BarChartProps {
  title: string
  data: BarChartDatum[]
  color?: string
  height?: number
}

/** A single-series bar chart, e.g. expense by category for a Day report. */
export function BarChart({
  title,
  data,
  color = 'var(--color-primary)',
  height = 96,
}: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const width = computeChartWidth(data.length)
  const barWidth = width / data.length
  const gap = barWidth * 0.25

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
          {data.map((d, i) => {
            const barHeight = (d.value / max) * (height - 16)
            const x = i * barWidth + gap / 2
            const w = barWidth - gap
            return (
              <g key={d.label}>
                <title>{d.label}</title>
                <rect
                  x={x}
                  y={height - 16 - barHeight}
                  width={w}
                  height={Math.max(barHeight, 1)}
                  rx={w * 0.25}
                  fill={color}
                />
                <text
                  x={x + w / 2}
                  y={height - 4}
                  fontSize={CHART_LABEL_FONT_SIZE}
                  textAnchor="middle"
                  fill="var(--color-text-muted)"
                >
                  {truncateLabel(d.label)}
                </text>
              </g>
            )
          })}
        </svg>
      </ChartScrollContainer>
      <ChartDataTable
        caption={title}
        columns={['Label', 'Value']}
        rows={data.map((d) => [d.label, d.value])}
      />
    </div>
  )
}
