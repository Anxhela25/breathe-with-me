/** A small dashboard tile: an icon in a soft circle, a label and a value. */
export default function StatTile({ icon, label, value, tone = 'pistachio' }) {
  const tones = { pistachio: 'bg-pistachio', blue: 'bg-soft-blue/70', lavender: 'bg-lavender' }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-sage/10 bg-white/80 px-3 py-2.5 shadow-sm shadow-sage/5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sage ${tones[tone]}`}>{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-xs text-sage/70">{label}</p>
        <p className="truncate font-bold leading-tight">{value}</p>
      </div>
    </div>
  )
}
