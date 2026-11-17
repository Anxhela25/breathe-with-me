// 8-10 is "strong" on the breathing page, so those get a red border
const border = n => (n >= 8 ? 'border-alert' : 'border-sage')

export default function NumberPicker({ question, onPick }) {
  return (
    <div className="w-full text-center">
      <p className="mb-1 text-base">{question}</p>
      <p className="mb-3 text-xs text-sage/70">1 = a little, 10 = the strongest</p>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            className={`h-12 min-w-12 rounded-xl border-2 bg-white text-lg font-bold text-sage-dark active:scale-95 active:bg-pistachio ${border(n)}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
