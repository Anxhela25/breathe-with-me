import { useEffect, useMemo, useState } from 'react'
import Screen from '../components/Screen.jsx'
import Button from '../components/Button.jsx'
import { getInsights, listEpisodes } from '../lib/api.js'
import { longDate, periodOf } from '../lib/format.js'

const PLACE = { home: 'home', work: 'work', street: 'outside', other: 'other' }
const SLEEP = { well: 'slept well', little: 'little sleep', very_little: 'very little sleep' }

function describe(e, includeNotes) {
  const date = new Date(e.started_at)
  const parts = [`${longDate(date)}, ${periodOf(date).toLowerCase()}`]
  if (e.start_level) parts.push(`strength ${e.start_level}${e.end_level ? ` → ${e.end_level}` : ''}/10`)
  if (e.worst_level) parts.push(`worst ${e.worst_level}/10`)
  if (e.place) parts.push(PLACE[e.place])
  if (e.sleep) parts.push(SLEEP[e.sleep])
  if (e.expected !== null) parts.push(e.expected ? 'expected' : 'out of the blue')
  if (e.with_someone !== null) parts.push(e.with_someone ? 'with someone' : 'alone')
  if (e.coffee !== null) parts.push(e.coffee ? 'coffee' : 'no coffee')
  if (e.used_grounding) parts.push('used grounding')
  if (includeNotes && e.note) parts.push(`note: "${e.note}"`)
  return `- ${parts.join(', ')}`
}

function buildText(insights, episodes, includeNotes) {
  const lines = [
    'Breathe With Me: summary of my panic episodes',
    '',
    `Period: ${longDate(new Date(insights.first))} to ${longDate(new Date(insights.last))}`,
    `Episodes recorded: ${insights.count}`,
  ]
  if (insights.average_strength) lines.push(`Average strength: ${insights.average_strength}/10`)
  if (insights.average_drop) lines.push(`Average change during a help session: ${insights.average_drop} points lower`)
  if (insights.patterns.length) lines.push('', 'Patterns:', ...insights.patterns.map(p => `- ${p.text}`))
  lines.push('', 'Episodes:', ...episodes.map(e => describe(e, includeNotes)))
  lines.push('', 'Recorded by me in a self-help app. These are patterns, not a diagnosis.')
  return lines.join('\n')
}

export default function Summary() {
  const [insights, setInsights] = useState(null)
  const [episodes, setEpisodes] = useState(null)
  const [includeNotes, setIncludeNotes] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getInsights(), listEpisodes()])
      .then(([i, e]) => { setInsights(i); setEpisodes(e) })
      .catch(() => setStatus("The summary couldn't be loaded. Please check your connection."))
  }, [])

  const text = useMemo(
    () => (insights && episodes?.length ? buildText(insights, episodes, includeNotes) : ''),
    [insights, episodes, includeNotes],
  )

  async function makePdf() {
    setStatus('')
    setBusy(true)
    try {
      const { buildSummaryPdf, deliverPdf } = await import('../lib/summaryPdf.js')
      const result = await deliverPdf(buildSummaryPdf(insights, episodes, includeNotes))
      if (result === 'downloaded') setStatus('The PDF is in your downloads. You choose who you send it to.')
    } catch (err) {
      console.warn('[summary] PDF failed:', err)
      setStatus("The PDF couldn't be created. You can still share or copy the text below.")
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    setStatus('')
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Summary for my doctor', text })
        return
      }
      await navigator.clipboard.writeText(text)
      setStatus('Copied. You can paste it into an email or a message to your doctor.')
    } catch (err) {
      if (err?.name !== 'AbortError') setStatus('Sharing is not available here. Select the text below and copy it.')
    }
  }

  return (
    <Screen>
      <h1 className="mt-6 text-2xl font-bold">Summary for my doctor</h1>
      <p className="mt-2 text-center text-sm text-sage/70">You choose who sees this. Nothing is sent automatically.</p>
      {text && (
        <>
          <label className="mt-6 flex w-full items-center gap-3 text-sm">
            <input id="include-notes" type="checkbox" checked={includeNotes} onChange={e => setIncludeNotes(e.target.checked)}
              className="h-5 w-5 accent-sage" />
            Include my notes
          </label>
          <pre className="mt-3 w-full whitespace-pre-wrap rounded-2xl border border-sage/15 bg-white p-4 font-sans text-sm">{text}</pre>
        </>
      )}
      <div className="mt-auto flex w-full flex-col items-center gap-3 pt-6">
        {status && <p role="status" className="text-center text-sm">{status}</p>}
        {text && (
          <>
            <Button onClick={makePdf} disabled={busy} className="disabled:opacity-50">
              {busy ? 'Creating PDF…' : 'Download PDF'}
            </Button>
            <Button onClick={share} variant="outline">Share or copy as text</Button>
          </>
        )}
        <Button to="/insights" variant="link">Back to patterns</Button>
      </div>
    </Screen>
  )
}
