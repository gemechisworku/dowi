import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as edgeConfig from '../../_lib/edgeConfig'
import * as webPush from '../../_lib/webPush'
import handler from '../sweep'
import type { PushDeviceEntry, PushDevices, SyncedReminderRules } from '../../_lib/types'

vi.mock('../../_lib/edgeConfig')
vi.mock('../../_lib/webPush')

const RULES_OFF: SyncedReminderRules = {
  morningNudge: { enabled: false, time: '09:00' },
  eveningStreak: { enabled: false, time: '21:00' },
  dailyAgenda: { enabled: false, time: '07:30' },
  weeklyPlan: { enabled: false, day: 1, time: '08:00' },
  weeklyReview: { enabled: false, day: 6, time: '18:00' },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  taskDueAt: [],
}

function makeEntry(overrides: Partial<PushDeviceEntry>): PushDeviceEntry {
  return {
    subscription: {
      endpoint: 'https://example.com/x',
      expirationTime: null,
      keys: { p256dh: 'a', auth: 'b' },
    },
    timeZone: 'UTC',
    rules: RULES_OFF,
    lastFired: {},
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeReq(headers: Record<string, string>): VercelRequest {
  return { headers } as unknown as VercelRequest
}

function makeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res as unknown as VercelResponse & typeof res
}

describe('POST /api/push/sweep', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.CRON_SECRET
  })

  it('rejects a request without the correct cron secret header', async () => {
    const req = makeReq({})
    const res = makeRes()

    await handler(req, res)

    expect(res.statusCode).toBe(401)
    expect(edgeConfig.getPushDevices).not.toHaveBeenCalled()
  })

  it('is a no-op read when no device is due, and never writes', async () => {
    const devices: PushDevices = { d1: makeEntry({}) }
    vi.mocked(edgeConfig.getPushDevices).mockResolvedValue(devices)

    const req = makeReq({ 'x-cron-secret': 'test-secret' })
    const res = makeRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ devices: 1, fired: 0, removed: 0 })
    expect(webPush.sendWakePush).not.toHaveBeenCalled()
    expect(edgeConfig.writePushDevices).not.toHaveBeenCalled()
  })

  it('sends a wake push and records lastFired for a due device', async () => {
    // Anchor "now" to a moment that matches the device's morning nudge time.
    const now = new Date('2026-06-01T09:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const devices: PushDevices = {
      d1: makeEntry({ rules: { ...RULES_OFF, morningNudge: { enabled: true, time: '09:00' } } }),
    }
    vi.mocked(edgeConfig.getPushDevices).mockResolvedValue(devices)
    vi.mocked(webPush.sendWakePush).mockResolvedValue({ ok: true, gone: false })

    const req = makeReq({ 'x-cron-secret': 'test-secret' })
    const res = makeRes()
    await handler(req, res)

    expect(webPush.sendWakePush).toHaveBeenCalledTimes(1)
    expect(edgeConfig.writePushDevices).toHaveBeenCalledTimes(1)
    const written = vi.mocked(edgeConfig.writePushDevices).mock.calls[0]?.[0]
    expect(written?.d1?.lastFired.morningNudge).toBe('2026-06-01')
    expect(res.body).toEqual({ devices: 1, fired: 1, removed: 0 })

    vi.useRealTimers()
  })

  it('drops a device whose subscription the push service reports gone, without sending again', async () => {
    const now = new Date('2026-06-01T09:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const devices: PushDevices = {
      d1: makeEntry({ rules: { ...RULES_OFF, morningNudge: { enabled: true, time: '09:00' } } }),
    }
    vi.mocked(edgeConfig.getPushDevices).mockResolvedValue(devices)
    vi.mocked(webPush.sendWakePush).mockResolvedValue({ ok: false, gone: true })

    const req = makeReq({ 'x-cron-secret': 'test-secret' })
    const res = makeRes()
    await handler(req, res)

    const written = vi.mocked(edgeConfig.writePushDevices).mock.calls[0]?.[0]
    expect(written).toEqual({})
    expect(res.body).toEqual({ devices: 1, fired: 0, removed: 1 })

    vi.useRealTimers()
  })
})
