import { FEELINGS } from '../lib/flow.js'

const EMOJI = { fine: '😆', better: '🙂', same: '😐', worse: '😟' }
// each answer its own colour: the emoji bubble, a soft wash at the bottom of the card, a light border
const TONE = {
  fine: ['bg-pistachio', 'to-pistachio/70', 'border-sage/25'],
  better: ['bg-[#FBE3A6]', 'to-[#FBE3A6]/45', 'border-[#E2B04F]/40'],
  same: ['bg-soft-blue', 'to-soft-blue/60', 'border-[#8FB1CC]/45'],
  worse: ['bg-lavender', 'to-lavender/70', 'border-alert/25'],
}

/** "How are you now?" with four plain answers. No numbers: in a panic, choosing a word is easier. */
export default function FeelingPicker({ question = 'How are you now?', onPick }) {
  return (
    <div className="w-full text-center">
      <p className="font-display text-2xl font-bold">{question}</p>
      <p className="mt-1 mb-5 text-sm text-sage/70">Choose the word that fits. There&apos;s no wrong answer.</p>
      <div className="grid grid-cols-2 gap-3">
        {FEELINGS.map(([key, label]) => {
          const [bubble, wash, border] = TONE[key]
          return (
            <button key={key} type="button" onClick={() => onPick(key)}
              className={`flex flex-col items-center gap-2 rounded-3xl border bg-gradient-to-b from-white px-3 py-4 shadow-sm shadow-sage/10 transition-transform active:scale-95 ${wash} ${border}`}>
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-3xl ring-4 ring-white/80 ${bubble}`} aria-hidden>
                {EMOJI[key]}
              </span>
              <span className="text-base font-bold text-sage-dark">{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
