import { describe, expect, it } from 'vitest'
import { transactionsToCsv, type CsvLookups } from '../csv'
import type { Account, Category, Source, Transaction } from '@/db/types'

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'tx-1',
    type: 'expense',
    amountMinorUnits: 12500,
    currency: 'ETB',
    date: '2026-09-19',
    categoryId: 'food',
    tags: [],
    createdAt: '2026-09-19T00:00:00.000Z',
    updatedAt: '2026-09-19T00:00:00.000Z',
    ...overrides,
  }
}

function category(id: string, name: string): Category {
  return { id, name, icon: '🍽️', color: '#000', type: 'expense', createdAt: '', updatedAt: '' }
}
function source(id: string, name: string): Source {
  return { id, name, createdAt: '', updatedAt: '' }
}
function account(id: string, name: string): Account {
  return { id, name, createdAt: '', updatedAt: '' }
}

const lookups: CsvLookups = {
  categoryById: new Map([['food', category('food', 'Food')]]),
  sourceById: new Map([['client-a', source('client-a', 'Client A')]]),
  accountById: new Map([['bank', account('bank', 'Bank')]]),
}

describe('transactionsToCsv', () => {
  it('has the correct header row', () => {
    const csv = transactionsToCsv([], lookups)
    expect(csv).toBe('Date,Type,Amount,Currency,Category,Source,Account,Note,Tags')
  })

  it('produces one row per transaction with resolved names', () => {
    const csv = transactionsToCsv(
      [tx({ accountId: 'bank', note: 'Lunch', tags: ['weekly'] })],
      lookups,
    )
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[1]).toBe('2026-09-19,expense,125.00,ETB,Food,,Bank,Lunch,weekly')
  })

  it('formats the amount as a plain decimal string with no thousands separator', () => {
    // A grouped "1,500" would either need quoting (fragile round-tripping)
    // or get misread as two fields — and in a comma-decimal locale, as the
    // wrong number entirely. Plain "1500"/"1500.00" is unambiguous everywhere.
    const csv = transactionsToCsv([tx({ currency: 'JPY', amountMinorUnits: 1500 })], lookups)
    expect(csv).toContain('2026-09-19,expense,1500,JPY,')

    const csvWithDecimals = transactionsToCsv(
      [tx({ currency: 'ETB', amountMinorUnits: 123450 })],
      lookups,
    )
    expect(csvWithDecimals).toContain('2026-09-19,expense,1234.50,ETB,')
  })

  it('escapes a comma in the note by quoting the field', () => {
    const csv = transactionsToCsv([tx({ note: 'Lunch, with the team' })], lookups)
    expect(csv).toContain('"Lunch, with the team"')
  })

  it('escapes an embedded quote by doubling it', () => {
    const csv = transactionsToCsv([tx({ note: 'The "best" lunch' })], lookups)
    expect(csv).toContain('"The ""best"" lunch"')
  })

  it('escapes an embedded newline by quoting the field', () => {
    const csv = transactionsToCsv([tx({ note: 'Line one\nLine two' })], lookups)
    expect(csv).toContain('"Line one\nLine two"')
  })

  it('leaves source/account blank when not set', () => {
    const csv = transactionsToCsv([tx({})], lookups)
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('2026-09-19,expense,125.00,ETB,Food,,,,')
  })

  it('joins multiple tags with a semicolon', () => {
    const csv = transactionsToCsv([tx({ tags: ['a', 'b', 'c'] })], lookups)
    expect(csv).toContain(',a; b; c')
  })
})
