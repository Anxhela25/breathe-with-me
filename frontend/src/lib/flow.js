// Where a 1-10 answer leads. One place for the whole help flow, so every page follows the same rules
// and the rules can be tested without the app (npm test).
//
// The ideas behind it:
// - the number decides the kind of help: 1-4 light (chat, finish), 5-7 medium (grounding), 8-10 strong
// - the same help is never repeated in a loop: when something didn't work, the next answer moves on
// - when nothing has worked, or after 20 minutes, "Not feeling better yet?" offers people and numbers

export const LIGHT = 4
export const MEDIUM = 7
export const MAX_STRONG_ROUNDS = 3  // the first 2 minutes plus two more while it's going down
export const LONG_SESSION_MIN = 20  // panic usually passes within 20 minutes; after that, more than breathing

export function band(level) {
  if (level <= LIGHT) return 'light'
  if (level <= MEDIUM) return 'medium'
  return 'strong'
}

/**
 * The next step after a 1-10 answer.
 *
 * where: 'breathing' (the question on the breathing page) or 'checkin' ("How do you feel now?", asked
 * after some help: grounding, the chat, or a few more minutes of breathing).
 * s: what happened so far in this session:
 *   previous       the answer before this one, or null
 *   afterRound     true when breathing asks again at the end of a 2-minute strong round
 *   strongRounds   strong rounds already done in this session
 *   usedGrounding  grounding was done in this session
 *   usedQuiet      the extra 2 minutes of quiet breathing for 5-7 were already given
 *   minutes        minutes since the session started
 *
 * Returns { step } and, for a strong round, goingDown; long is set when the 20-minute rule sent her
 * to "Not feeling better yet?". The steps:
 *   offer-chat, offer-grounding  stay on the breathing page and offer it (with "Keep breathing")
 *   strong-round                 2 more minutes of breathing, then the question again
 *   closing, still-there         "You did it" / "It's still a little there"
 *   grounding, quiet             go to grounding / 2 minutes of quiet breathing
 *   not-better                   "Not feeling better yet?"
 */
export function nextStep(level, where, s) {
  const { previous = null, afterRound = false, strongRounds = 0, usedGrounding = false, usedQuiet = false,
    minutes = 0 } = s
  const kind = band(level)

  // a long session that is still at 5 or more needs more than another exercise
  if (minutes >= LONG_SESSION_MIN && kind !== 'light') return { step: 'not-better', long: true }

  if (kind === 'light') {
    if (where === 'breathing') return { step: 'offer-chat' }
    // still light, but higher than last time (3 -> 4): don't say it passed
    return { step: previous != null && level > previous ? 'still-there' : 'closing' }
  }

  if (kind === 'medium') {
    if (where === 'breathing') return { step: 'offer-grounding' }
    if (!usedGrounding) return { step: 'grounding' }
    if (!usedQuiet) return { step: 'quiet' }
    return { step: 'not-better' }
  }

  // strong (8-10)
  // after grounding, the chat or extra breathing it's still strong: don't start the rounds again
  if (where === 'checkin') return { step: 'not-better' }
  // a round of breathing and not lower: breathing isn't enough on its own
  if (afterRound && previous != null && level >= previous) return { step: 'not-better' }
  if (strongRounds >= MAX_STRONG_ROUNDS) return { step: 'not-better' }
  return { step: 'strong-round', goingDown: afterRound }
}
