import { createDatabase, type DowiDatabase } from '../db'

let counter = 0

/** A fresh, isolated in-memory (fake-indexeddb) database for one test. */
export function createTestDb(): DowiDatabase {
  counter += 1
  return createDatabase(`dowi-test-${Date.now()}-${counter}`)
}
