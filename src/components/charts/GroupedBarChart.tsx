import { ChartDataTable } from './ChartDataTable'
import { ChartScrollContainer } from './ChartScrollContainer'
import { CHART_LABEL_FONT_SIZE, computeChartWidth, truncateLabel } from './chartLayout'

export interface GroupedBarChartDatum {
  label: string
  income: number
  expense: number
}

export interface GroupedBarChartProps {
  title: string
  data: GroupedBarChartDatum[]
  height?: number
}

/** The income-vs-expense chart used across every report period (PRD §5.4). */
export function GroupedBarChart({ title, data, height = 90 }: GroupedBarChartProps) {
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]))
  const width = computeChartWidth(data.length)
  const groupWidth = width / data.length
  const barWidth = groupWidth * 0.3
  const chartHeight = height - 14

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
            const groupX = i * groupWidth + groupWidth / 2
            const incomeH = (d.income / max) * chartHeight
            const expenseH = (d.expense / max) * chartHeight
            return (
              <g key={d.label}>
                <title>{d.label}</title>
                <rect
                  x={groupX - barWidth - 1}
                  y={chartHeight - incomeH}
                  width={barWidth}
                  height={Math.max(incomeH, 1)}
                  rx={barWidth * 0.3}
                  fill="var(--color-income)"
                />
                <rect
                  x={groupX + 1}
                  y={chartHeight - expenseH}
                  width={barWidth}
                  height={Math.max(expenseH, 1)}
                  rx={barWidth * 0.3}
                  fill="var(--color-expense)"
                />
                <text
                  x={groupX}
                  y={height - 2}
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
      <div
        className="mt-1 flex items-center gap-4 text-xs"
        style={{ color: 'var(--color-text-muted)' }}
      >
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-income)' }}
          />
          Income
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full"
            style={{ background: 'var(--color-expense)' }}
          />
          Expense
        </span>
      </div>
      <ChartDataTable
        caption={title}
        columns={['Period', 'Income', 'Expense']}
        rows={data.map((d) => [d.label, d.income, d.expense])}
      />
    </div>
  )
}
