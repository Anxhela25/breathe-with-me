// Where an answer to "How are you now?" leads. One place for the whole help flow, kept simple:
// - no numbers during the panic: four plain answers, the same every time
// - fine: it passed · better: it's passing · the same: something else to try (once) · worse: people and help
// - asked at most twice; the second time "the same" also leads to people and help
// - a button that says "I feel better" is the answer: it never asks again afterwards
// Tested in flow.test.js (npm test).

export const LONG_SESSION_MIN = 20  // panic usually passes within 20 minutes; after that, the doctor note shows

export const FEELINGS = [
  ['fine', "I'm fine now"],
  ['better', 'Better'],
  ['same', 'About the same'],
  ['worse', 'Worse'],
]

/**
 * The next step after an answer. asked: how many times she already answered in this session.
 * Steps: 'passed' (You did it), 'passing' (You're getting through it), 'try-else', 'not-better'.
 */
export function nextStep(feeling, asked = 0) {
  if (feeling === 'fine') return 'passed'
  if (feeling === 'better') return 'passing'
  if (feeling === 'same' && asked === 0) return 'try-else'
  return 'not-better'
}
