// Where a 1-10 answer leads. One place for the whole help flow, kept simple on purpose:
// - the app asks at most twice before it finishes or shows help (three times only via grounding)
// - 1-4 finishes, 5-7 gets grounding once, 8-10 gets 2 more minutes of breathing once
// - when that didn't help, "Not feeling better yet?" offers people and numbers; from there no more questions
// - a button that says "I feel better" is the answer: it never asks for a number afterwards
// Tested in flow.test.js (npm test).

export const LIGHT = 4
export const MEDIUM = 7
export const LONG_SESSION_MIN = 20  // panic usually passes within 20 minutes; after that, the doctor note shows

export function band(level) {
  if (level <= LIGHT) return 'light'
  if (level <= MEDIUM) return 'medium'
  return 'strong'
}

/**
 * The next step after a 1-10 answer.
 * where: 'breathing' (asked on the breathing page) or 'checkin' ("How do you feel now?", after help)
 * s.usedGrounding: grounding was done in this session
 * s.strongRounds: the extra 2 minutes for 8-10 were already given
 *
 * Steps: 'finish' (It's easing / You did it), 'grounding', 'strong-round' (2 more minutes, then the
 * question again), 'not-better' ("Not feeling better yet?").
 */
export function nextStep(level, where, s = {}) {
  const { usedGrounding = false, strongRounds = 0 } = s
  const kind = band(level)
  if (kind === 'light') return 'finish'
  if (kind === 'medium') return usedGrounding ? 'not-better' : 'grounding'
  // strong: one extra round of breathing on the breathing page, then help
  return where === 'breathing' && strongRounds === 0 ? 'strong-round' : 'not-better'
}
