// same groups as the breathing page: 1-4 light, 5-7 medium, 8-10 strong.
// soft colours on purpose, no red: red would add alarm while she is already scared
function tint(n) {
  if (n <= 4) return 'bg-pistachio/60'
  if (n <= 7) return 'bg-soft-blue/50'
  return 'bg-lavender/70'
}

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
            className={`h-12 min-w-12 rounded-xl border-2 border-sage text-lg font-bold text-sage-dark active:scale-95 active:bg-white ${tint(n)}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
