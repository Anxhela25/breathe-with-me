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
            className="h-12 min-w-12 rounded-xl border border-sage/20 bg-white text-lg text-sage active:bg-pistachio"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}
