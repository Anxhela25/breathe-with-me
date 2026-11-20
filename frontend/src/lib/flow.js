// Where an answer to "How are you now?" leads. The whole help flow is here:
// - no numbers during panic, always the same four answers
// - fine: passed, better: passing, same: try something else (once)
// - worse: rule out a medical emergency first, then breathe at own pace
// - asked max twice, the second "same" also leads to people and help
// - an "I feel better" button counts as the answer, no more questions after
// Tests in flow.test.js (npm test)

export const LONG_SESSION_MIN = 20  // panic usually passes within 20 min, after that the doctor note shows

export const FEELINGS = [
  ['fine', "I'm fine now"],
  ['better', 'Better'],
  ['same', 'About the same'],
  ['worse', 'Worse'],
]

/**
 * Next step after an answer. `asked` = how many times answered this session.
 * Steps: 'passed', 'passing', 'try-else', 'worse', 'not-better'.
 */
export function nextStep(feeling, asked = 0) {
  if (feeling === 'fine') return 'passed'
  if (feeling === 'better') return 'passing'
  if (feeling === 'worse') return 'worse'
  if (feeling === 'same' && asked === 0) return 'try-else'
  return 'not-better'
}
