// Run with: npm test (Node's own test runner, nothing to install)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_STRONG_ROUNDS, nextStep } from './flow.js'

const ENDS = new Set(['closing', 'still-there', 'not-better'])

// Plays a session like the app does: the first question is on the breathing page; "Keep breathing" on
// an offer, grounding and quiet breathing all lead to "How do you feel now?".
function play(answers, { minutes = 0 } = {}) {
  let s = { previous: null, afterRound: false, strongRounds: 0, usedGrounding: false, usedQuiet: false, minutes }
  let where = 'breathing'
  const steps = []
  for (const level of answers) {
    const { step, goingDown } = nextStep(level, where, s)
    steps.push(goingDown ? 'going-down' : step)
    s = { ...s, previous: level, afterRound: false }
    if (step === 'strong-round') { s.strongRounds += 1; s.afterRound = true; where = 'breathing' }
    else if (step === 'grounding') { s.usedGrounding = true; where = 'checkin' }
    else if (step === 'quiet') { s.usedQuiet = true; where = 'checkin' }
    else if (step === 'offer-grounding') { s.usedGrounding = true; where = 'checkin' }  // took the offer
    else if (step === 'offer-chat') where = 'checkin'
    else if (ENDS.has(step)) break
  }
  return steps
}

test('light at the first question: chat is offered, then it can finish', () => {
  assert.deepEqual(play([3, 2]), ['offer-chat', 'closing'])
})

test('light going down finishes with "You did it"; going up (3 -> 4) gets "It\'s still a little there"', () => {
  assert.deepEqual(play([4, 3]), ['offer-chat', 'closing'])
  assert.deepEqual(play([4, 4]), ['offer-chat', 'closing'])
  assert.deepEqual(play([3, 4]), ['offer-chat', 'still-there'])
})

test('medium: grounding is offered, then quiet breathing, then the choices page', () => {
  assert.deepEqual(play([6, 6, 6]), ['offer-grounding', 'quiet', 'not-better'])
  assert.deepEqual(play([6, 3]), ['offer-grounding', 'closing'])
})

test('5 then 6 after grounding: 2 minutes of quiet breathing, not grounding again', () => {
  assert.deepEqual(play([5, 6]), ['offer-grounding', 'quiet'])
})

test('strong and not going down after a round: the choices page', () => {
  assert.deepEqual(play([9, 9]), ['strong-round', 'not-better'])
  assert.deepEqual(play([9, 10]), ['strong-round', 'not-better'])
})

test('strong and going down: at most two more rounds', () => {
  assert.deepEqual(play([10, 9, 8]), ['strong-round', 'going-down', 'going-down'])
  // the rounds are used up: still strong goes to the choices page even though it went down
  assert.equal(MAX_STRONG_ROUNDS, 3)
  assert.deepEqual(nextStep(8, 'breathing', { previous: 9, afterRound: true, strongRounds: 3 }), { step: 'not-better' })
})

test('the reported case: 10, 9, 8, 7, grounding, then 8: the choices page, not new rounds', () => {
  assert.deepEqual(play([10, 9, 8, 7, 8]),
    ['strong-round', 'going-down', 'going-down', 'offer-grounding', 'not-better'])
})

test('strong at "How do you feel now?" always goes to the choices page', () => {
  for (const level of [8, 9, 10]) {
    assert.equal(nextStep(level, 'checkin', { previous: 3 }).step, 'not-better')
  }
})

test('after 20 minutes, 5 or more goes to the choices page; light can still finish', () => {
  assert.deepEqual(play([6], { minutes: 20 }), ['not-better'])
  assert.deepEqual(play([9], { minutes: 25 }), ['not-better'])
  assert.deepEqual(play([2], { minutes: 25 }), ['offer-chat'])
})

test('from "Not feeling better yet?" -> keep breathing -> "How do you feel now?"', () => {
  const s = { previous: 9, usedGrounding: true, usedQuiet: true, strongRounds: 2, minutes: 8 }
  assert.equal(nextStep(2, 'checkin', s).step, 'closing')
  assert.equal(nextStep(6, 'checkin', s).step, 'not-better')
  assert.equal(nextStep(9, 'checkin', s).step, 'not-better')
  // 6 without grounding yet: grounding is still worth trying
  assert.equal(nextStep(6, 'checkin', { ...s, usedGrounding: false }).step, 'grounding')
})

test('every possible sequence of answers ends: no loops anywhere', () => {
  // walk all answers from every reachable situation; a situation seen twice on one path is a loop
  const key = (where, s) => JSON.stringify([where, s.previous, s.afterRound, s.strongRounds, s.usedGrounding, s.usedQuiet])
  let longest = 0
  function walk(where, s, seen, depth) {
    longest = Math.max(longest, depth)
    const k = key(where, s)
    assert.ok(!seen.has(k), `loop at ${k}`)
    const next = new Set(seen).add(k)
    for (let level = 1; level <= 10; level++) {
      const { step } = nextStep(level, where, s)
      if (ENDS.has(step)) continue
      const n = { ...s, previous: level, afterRound: false }
      if (step === 'strong-round') walk('breathing', { ...n, strongRounds: s.strongRounds + 1, afterRound: true }, next, depth + 1)
      else if (step === 'grounding') walk('checkin', { ...n, usedGrounding: true }, next, depth + 1)
      else if (step === 'offer-grounding') {
        walk('checkin', { ...n, usedGrounding: true }, next, depth + 1)  // took grounding
        walk('checkin', n, next, depth + 1)  // "Keep breathing" instead
      }
      else if (step === 'quiet') walk('checkin', { ...n, usedQuiet: true }, next, depth + 1)
      else if (step === 'offer-chat') walk('checkin', n, next, depth + 1)
    }
  }
  walk('breathing', { previous: null, afterRound: false, strongRounds: 0, usedGrounding: false, usedQuiet: false }, new Set(), 0)
  assert.ok(longest <= 8, `longest path ${longest} answers`)
})
