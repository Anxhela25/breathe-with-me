import { FEELINGS } from '../lib/flow.js'

// a face for each answer: the mouth goes from a wide smile to a small frown
const MOUTH = {
  fine: 'M8 14c1.2 2 6.8 2 8 0',
  better: 'M8.5 14.5c1.5 1.2 5.5 1.2 7 0',
  same: 'M8.5 15h7',
  worse: 'M8.5 16c1.5-1.2 5.5-1.2 7 0',
}
const TONE = {
  fine: 'bg-pistachio',
  better: 'bg-pistachio/60',
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
            <span className={`flex h-12 w-12 items-center justify-center rounded-full ${TONE[key]}`} aria-hidden>
              <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#2F4136" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <circle cx="9" cy="10" r="0.6" fill="#2F4136" />
                <circle cx="15" cy="10" r="0.6" fill="#2F4136" />
                <path d={MOUTH[key]} />
              </svg>
            </span>
            <span className="text-base font-bold text-sage-dark">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
