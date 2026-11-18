import { FEELINGS } from '../lib/flow.js'

const EMOJI = { fine: '😆', better: '🙂', same: '😐', worse: '😟' }
// each answer its own colour, circle and border: green, warm yellow, blue, red
const TONE = {
  fine: ['bg-pistachio', 'border-sage/60'],
  better: ['bg-[#FBE3A6]', 'border-[#E2B04F]'],
  same: ['bg-soft-blue', 'border-[#8FB1CC]'],
  worse: ['bg-lavender', 'border-alert/60'],
}

/** "How are you now?" with four plain answers. No numbers: in a panic, choosing a word is easier. */
export default function FeelingPicker({ question = 'How are you now?', onPick }) {
  return (
    <div className="w-full text-center">
      <p className="mb-4 text-xl font-bold">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        {FEELINGS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => onPick(key)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 bg-white px-3 py-4 active:scale-95 ${TONE[key][1]}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-3xl ${TONE[key][0]}`} aria-hidden>
              {EMOJI[key]}
            </span>
            <span className="text-base font-bold text-sage-dark">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
