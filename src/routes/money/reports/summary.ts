import type { Category } from '@/db/types'
import { formatMoney } from '@/lib/money'
import type { ReportData } from './aggregate'

/**
 * Plain-text version of the headline + top categories, for the Web Share API
 * / clipboard fallback. Deliberately excludes source/account breakdowns and
 * sub-period detail — this is a quick "here's how the period went" message,
 * not a data export (CSV already covers that).
 */
export function buildShareSummary(
  report: ReportData,
  periodLabel: string,
  baseCurrency: string,
  categoryById: Map<string, Category>,
): string {
  const lines = [
    `Dowi — ${periodLabel}`,
    '',
    `Income: ${formatMoney(report.income.totalMinorUnits, baseCurrency)}`,
    `Expense: ${formatMoney(report.expense.totalMinorUnits, baseCurrency)}`,
    `Net: ${formatMoney(report.netMinorUnits, baseCurrency)}`,
  ]

  const topExpenses = report.categoryBreakdown.expense.slice(0, 3)
  if (topExpenses.length > 0) {
    lines.push('', 'Top expenses:')
    for (const entry of topExpenses) {
      const name = entry.key
        ? (categoryById.get(entry.key)?.name ?? 'Uncategorised')
        : 'Uncategorised'
      lines.push(`- ${name}: ${formatMoney(entry.amountMinorUnits, baseCurrency)}`)
    }
  }

  return lines.join('\n')
}
