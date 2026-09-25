import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as edgeConfig from '../../_lib/edgeConfig'
import handler from '../subscribe'
import type { PushDevices, SyncedReminderRules } from '../../_lib/types'

vi.mock('../../_lib/edgeConfig')

const RULES_OFF: SyncedReminderRules = {
  morningNudge: { enabled: false, time: '09:00' },
  eveningStreak: { enabled: false, time: '21:00' },
  dailyAgenda: { enabled: false, time: '07:30' },
  weeklyPlan: { enabled: false, day: 1, time: '08:00' },
  weeklyReview: { enabled: false, day: 6, time: '18:00' },
  quietHours: { enabled: false, start: '22:00', end: '07:00' },
  taskDueAt: [],
}

const VALID_SUBSCRIPTION = {
  endpoint: 'https://example.com/push/abc',
  expirationTime: null,
  keys: { p256dh: 'a', auth: 'b' },
}

function makeReq(method: string, body: unknown): VercelRequest {
  return { method, body } as unknown as VercelRequest
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

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.mocked(edgeConfig.getPushDevices).mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects non-POST methods', async () => {
    const req = makeReq('GET', {})
    const res = makeRes()
    await handler(req, res)
    expect(res.statusCode).toBe(405)
    expect(edgeConfig.writePushDevices).not.toHaveBeenCalled()
  })

  it('rejects a malformed body', async () => {
    const req = makeReq('POST', { deviceId: 'd1' /* missing subscription/timeZone/rules */ })
    const res = makeRes()
    await handler(req, res)
    expect(res.statusCode).toBe(400)
    expect(edgeConfig.writePushDevices).not.toHaveBeenCalled()
  })

  it('stores a valid subscription and echoes success', async () => {
    const req = makeReq('POST', {
      deviceId: 'd1',
      subscription: VALID_SUBSCRIPTION,
      timeZone: 'Africa/Addis_Ababa',
      rules: RULES_OFF,
    })
    const res = makeRes()
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    const written = vi.mocked(edgeConfig.writePushDevices).mock.calls[0]?.[0] as PushDevices
    expect(written.d1?.timeZone).toBe('Africa/Addis_Ababa')
    expect(written.d1?.lastFired).toEqual({})
  })

  it('preserves an existing device entry’s lastFired instead of resetting it', async () => {
    vi.mocked(edgeConfig.getPushDevices).mockResolvedValue({
      d1: {
        subscription: VALID_SUBSCRIPTION,
        timeZone: 'UTC',
        rules: RULES_OFF,
        lastFired: { morningNudge: '2026-06-01' },
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
    })

    const req = makeReq('POST', {
      deviceId: 'd1',
      subscription: VALID_SUBSCRIPTION,
      timeZone: 'UTC',
      rules: { ...RULES_OFF, morningNudge: { enabled: true, time: '10:00' } }, // settings changed
    })
    const res = makeRes()
    await handler(req, res)

    const written = vi.mocked(edgeConfig.writePushDevices).mock.calls[0]?.[0] as PushDevices
    expect(written.d1?.lastFired).toEqual({ morningNudge: '2026-06-01' })
    expect(written.d1?.rules.morningNudge.time).toBe('10:00')
  })
})
