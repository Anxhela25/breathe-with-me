import { FEELINGS } from '../lib/flow.js'

const EMOJI = { fine: '😆', better: '🙂', same: '😐', worse: '😟' }
const TONE = {
  fine: 'bg-pistachio',
  better: 'bg-[#FBEBC5]',  // warm, like the sunrise on "getting through it"
  same: 'bg-soft-blue/70',
  worse: 'bg-lavender',
}

/** "How are you now?" with four plain answers. No numbers: in a panic, choosing a word is easier. */
export default function FeelingPicker({ question = 'How are you now?', onPick }) {
  return (
    <div className="w-full text-center">
      <p className="mb-4 text-xl font-bold">{question}</p>
      <div className="grid grid-cols-2 gap-3">
        {FEELINGS.map(([key, label]) => (
          <button key={key} type="button" onClick={() => onPick(key)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 active:scale-95 ${
              key === 'worse' ? 'border-alert/50 bg-white' : 'border-sage/30 bg-white'}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-full text-3xl ${TONE[key]}`} aria-hidden>
              {EMOJI[key]}
            </span>
            <span className="text-base font-bold text-sage-dark">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
