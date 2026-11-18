// Run with: npm test (Node's own test runner, nothing to install)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FEELINGS, nextStep } from './flow.js'

test('first answer after the 2 minutes', () => {
  assert.equal(nextStep('fine', 0), 'passed')
  assert.equal(nextStep('better', 0), 'passing')
  assert.equal(nextStep('same', 0), 'try-else')
  assert.equal(nextStep('worse', 0), 'not-better')
})

test('second answer, after grounding, the chat or more breathing', () => {
  assert.equal(nextStep('fine', 1), 'passed')
  assert.equal(nextStep('better', 1), 'passing')
  assert.equal(nextStep('same', 1), 'not-better')  // no third exercise: people and help
  assert.equal(nextStep('worse', 1), 'not-better')
})

test('it always ends after at most 2 answers', () => {
  for (const [first] of FEELINGS) {
    const step = nextStep(first, 0)
    if (step !== 'try-else') continue
    for (const [second] of FEELINGS) assert.notEqual(nextStep(second, 1), 'try-else')
  }
})
