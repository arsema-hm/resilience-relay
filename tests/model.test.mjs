import test from 'node:test'
import assert from 'node:assert/strict'
import { initialData, markTicketRepaired, recordReport, riskScore } from '../src/lib/model.ts'

const at = (hours, battery = 'healthy', backup = 'available', fridge = 'healthy', id = 'test') => ({ id, facilityId: 'f-04', createdAt: new Date().toISOString(), outageHours: hours, battery, backup, fridge, channel: 'web' })

test('a healthy reporting facility scores zero', () => {
  const facility = initialData.facilities.find(f => f.id === 'f-04')
  assert.equal(riskScore(facility, [at(0)], [], Date.now()).total, 0)
})

test('worsening outage, storage, and critical-load observations do not lower priority', () => {
  const facility = initialData.facilities.find(f => f.id === 'f-01')
  const score = report => riskScore(facility, [report], [], Date.now()).total
  assert.ok(score(at(6)) >= score(at(0)))
  assert.ok(score(at(6, 'low')) >= score(at(6, 'healthy')))
  assert.ok(score(at(6, 'failed', 'unavailable', 'failed')) >= score(at(6, 'low', 'limited', 'at_risk')))
})

test('repeat severe reports do not create duplicate unresolved tickets', () => {
  const failed = at(1, 'failed', 'available', 'healthy', 'failed-a')
  const second = { ...failed, id: 'failed-b', createdAt: new Date(Date.now() + 1000).toISOString() }
  const once = recordReport({ ...initialData, tickets: [], reports: [] }, failed)
  const twice = recordReport(once, second)
  assert.equal(twice.tickets.filter(t => t.facilityId === 'f-04' && t.status !== 'verified').length, 1)
})

test('two later healthy reports verify a reported repair', () => {
  const start = { ...initialData, tickets: [{ id: 'ticket-a', facilityId: 'f-04', issue: 'Battery failure', owner: 'Officer', createdAt: new Date(Date.now()-86400000).toISOString(), dueAt: new Date().toISOString(), status: 'open', healthyAfterFix: 0 }], reports: [] }
  const fixed = markTicketRepaired(start, 'ticket-a', new Date(Date.now()-10000).toISOString())
  const one = recordReport(fixed, at(1, 'healthy', 'available', 'healthy', 'good-a'))
  assert.equal(one.tickets[0].status, 'fixed_reported')
  assert.equal(one.tickets[0].healthyAfterFix, 1)
  const two = recordReport(one, { ...at(1, 'healthy', 'available', 'healthy', 'good-b'), createdAt: new Date(Date.now()+10000).toISOString() })
  assert.equal(two.tickets[0].status, 'verified')
})

test('an unhealthy report after a repair resets the verification count', () => {
  const start = { ...initialData, tickets: [{ id: 'ticket-b', facilityId: 'f-04', issue: 'Grid outage', owner: 'Officer', createdAt: new Date(Date.now()-86400000).toISOString(), dueAt: new Date().toISOString(), status: 'fixed_reported', fixedAt: new Date(Date.now()-60000).toISOString(), healthyAfterFix: 1 }], reports: [] }
  const bad = recordReport(start, at(8, 'healthy', 'available', 'healthy', 'bad-after-fix'))
  assert.equal(bad.tickets[0].status, 'fixed_reported')
  assert.equal(bad.tickets[0].healthyAfterFix, 0)
})
