// Run with: npm test (Node's own test runner, nothing to install)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextStep } from './flow.js'

const ENDS = new Set(['finish', 'not-better'])

// Plays a session like the app does: the first question is on the breathing page; after grounding the
// question is "How do you feel now?"; after the extra 2 minutes it is asked again on the breathing page.
function play(answers) {
  let s = { usedGrounding: false, strongRounds: 0 }
  let where = 'breathing'
  const steps = []
  for (const level of answers) {
    const step = nextStep(level, where, s)
    steps.push(step)
    if (step === 'grounding') { s = { ...s, usedGrounding: true }; where = 'checkin' }
    else if (step === 'strong-round') { s = { ...s, strongRounds: 1 }; where = 'breathing' }
    else break
  }
  return steps
}

test('1-4 at the first question finishes', () => {
  for (const level of [1, 2, 3, 4]) assert.deepEqual(play([level]), ['finish'])
})

test('5-7: grounding, then finish or help', () => {
  assert.deepEqual(play([6, 3]), ['grounding', 'finish'])
  assert.deepEqual(play([6, 6]), ['grounding', 'not-better'])
  assert.deepEqual(play([5, 9]), ['grounding', 'not-better'])
})

test('8-10: 2 more minutes once, then finish, grounding or help', () => {
  assert.deepEqual(play([10, 10]), ['strong-round', 'not-better'])
  assert.deepEqual(play([10, 9]), ['strong-round', 'not-better'])
  assert.deepEqual(play([9, 3]), ['strong-round', 'finish'])
  assert.deepEqual(play([9, 6, 2]), ['strong-round', 'grounding', 'finish'])
  assert.deepEqual(play([9, 6, 6]), ['strong-round', 'grounding', 'not-better'])
})

test('"How do you feel now?" after other help (chat, back to breathing)', () => {
  assert.equal(nextStep(2, 'checkin'), 'finish')
  assert.equal(nextStep(6, 'checkin'), 'grounding')
  assert.equal(nextStep(6, 'checkin', { usedGrounding: true }), 'not-better')
  assert.equal(nextStep(9, 'checkin'), 'not-better')  // no new rounds outside the breathing page
})

test('every series of answers ends after at most 3 questions', () => {
  let longest = 0
  function walk(where, s, depth) {
    longest = Math.max(longest, depth)
    assert.ok(depth <= 3, 'more than 3 questions')
    for (let level = 1; level <= 10; level++) {
      const step = nextStep(level, where, s)
      if (ENDS.has(step)) continue
      if (step === 'grounding') walk('checkin', { ...s, usedGrounding: true }, depth + 1)
      else walk('breathing', { ...s, strongRounds: 1 }, depth + 1)
    }
  }
  walk('breathing', { usedGrounding: false, strongRounds: 0 }, 1)
  assert.equal(longest, 3)  // the longest: 9 -> 6 (grounding) -> any answer
})
