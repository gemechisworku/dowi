import type { Account, Category, Source, Transaction } from '@/db/types'
import { formatMinorUnitsPlain } from '@/lib/money'

export interface CsvLookups {
  categoryById: Map<string, Category>
  sourceById: Map<string, Source>
  accountById: Map<string, Account>
}

const HEADER = [
  'Date',
  'Type',
  'Amount',
  'Currency',
  'Category',
  'Source',
  'Account',
  'Note',
  'Tags',
]

/** Quotes a CSV field only when needed, doubling any embedded quotes (RFC 4180). */
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** One row per transaction, amounts as plain decimal strings (never scientific notation, never pre-summed). */
export function transactionsToCsv(transactions: Transaction[], lookups: CsvLookups): string {
  const rows = transactions.map((t) => {
    const fields = [
      t.date,
      t.type,
      formatMinorUnitsPlain(t.amountMinorUnits, t.currency),
      t.currency,
      lookups.categoryById.get(t.categoryId)?.name ?? '',
      t.sourceId ? (lookups.sourceById.get(t.sourceId)?.name ?? '') : '',
      t.accountId ? (lookups.accountById.get(t.accountId)?.name ?? '') : '',
      t.note ?? '',
      t.tags.join('; '),
    ]
    return fields.map(csvField).join(',')
  })
  return [HEADER.join(','), ...rows].join('\r\n')
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
