// Builds the doctor summary PDF on the device, nothing is uploaded.
// Loaded on demand so jsPDF isn't in the main bundle.
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import { Capacitor } from '@capacitor/core'
import { longDate, periodOf } from './format.js'

const SAGE = [74, 99, 85]
const TEXT = [47, 65, 54]
const MUTED = [110, 125, 115]
const PLACE = { home: 'Home', work: 'Work', street: 'Outside', other: 'Other' }
const SLEEP = { well: 'slept well', little: 'little sleep', very_little: 'very little sleep' }
const DISCLAIMER = 'Recorded by the patient in a self-help app. These are patterns, not a diagnosis.'

// Built-in PDF fonts cover Western European letters (ë, ç) but not everything.
// Replace the common ones and drop the rest (emoji etc.) instead of printing garbage.
function pdfSafe(text) {
  return String(text ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/→/g, '->')
    .normalize('NFC')
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/gu, ch => ch.normalize('NFKD').replace(/[^\x20-\x7E\xA0-\xFF]/gu, ''))
}

function yesNo(value, yes, no) {
  return value === null || value === undefined ? null : value ? yes : no
}

function episodeRow(e, includeNotes) {
  const date = new Date(e.started_at)
  const strength = e.start_level ? `${e.start_level}${e.end_level ? ` -> ${e.end_level}` : ''}` : '-'
  const context = [
    e.place && PLACE[e.place],
    e.sleep && SLEEP[e.sleep],
    yesNo(e.with_someone, 'with someone', 'alone'),
    yesNo(e.coffee, 'coffee', 'no coffee'),
    e.used_grounding && 'used grounding',
  ].filter(Boolean).join(', ')
  const row = [
    longDate(date),
    periodOf(date),
    strength,
    e.worst_level ? String(e.worst_level) : '-',
    yesNo(e.expected, 'Expected', 'Out of the blue') ?? '-',
    context || '-',
  ]
  if (includeNotes) row.push(e.note || '')
  return row.map(pdfSafe)
}

export function buildSummaryPdf(insights, episodes, includeNotes) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const width = doc.internal.pageSize.getWidth()
  const margin = 48
  let y = 64

  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...TEXT)
  doc.text('Summary of panic episodes', margin, y)
  y += 18
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...MUTED)
  doc.text(pdfSafe(`Prepared on ${longDate(new Date())} with Breathe With Me, a self-help app.`), margin, y)
  y += 12
  doc.setDrawColor(...SAGE).setLineWidth(1.5).line(margin, y, width - margin, y)
  y += 26

  // key numbers
  const facts = [
    ['Period', `${longDate(new Date(insights.first))} to ${longDate(new Date(insights.last))}`],
    ['Episodes recorded', String(insights.count)],
  ]
  if (insights.average_strength) facts.push(['Average strength', `${insights.average_strength} / 10`])
  if (insights.average_drop) facts.push(['Average change during a help session', `${insights.average_drop} points lower`])
  doc.setFontSize(11)
  for (const [label, value] of facts) {
    doc.setFont('helvetica', 'bold').setTextColor(...TEXT).text(pdfSafe(label), margin, y)
    doc.setFont('helvetica', 'normal').text(pdfSafe(value), margin + 220, y)
    y += 18
  }

  if (insights.patterns.length) {
    y += 14
    doc.setFont('helvetica', 'bold').setFontSize(13).text('Patterns', margin, y)
    y += 18
    doc.setFont('helvetica', 'normal').setFontSize(11)
    for (const pattern of insights.patterns) {
      const lines = doc.splitTextToSize(pdfSafe(pattern.text), width - 2 * margin - 14)
      doc.text('•', margin, y)
      doc.text(lines, margin + 14, y)
      y += 16 * lines.length
    }
  }

  y += 14
  doc.setFont('helvetica', 'bold').setFontSize(13).text('Episodes', margin, y)
  const head = ['Date', 'Time of day', 'Strength (start -> end)', 'Worst', 'Onset', 'Context']
  if (includeNotes) head.push('Note')
  autoTable(doc, {
    startY: y + 8,
    margin: { left: margin, right: margin, bottom: 60 },
    head: [head],
    body: episodes.map(e => episodeRow(e, includeNotes)),
    styles: { font: 'helvetica', fontSize: 8.5, textColor: TEXT, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: SAGE, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [244, 247, 242] },
  })

  // footer on every page
  const pages = doc.getNumberOfPages()
  const bottom = doc.internal.pageSize.getHeight() - 30
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page)
    doc.setFont('helvetica', 'normal').setFontSize(8.5).setTextColor(...MUTED)
    doc.text(DISCLAIMER, margin, bottom)
    doc.text(`Page ${page} of ${pages}`, width - margin, bottom, { align: 'right' })
  }
  return doc
}

export const PDF_NAME = 'summary-for-my-doctor.pdf'

/** Opens the share sheet in the iPhone app; downloads the file in a browser. */
export async function deliverPdf(doc) {
  if (Capacitor.isNativePlatform()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const { Share } = await import('@capacitor/share')
    const data = doc.output('datauristring').split(',')[1]
    // cache dir is private, iOS clears it when it needs space
    const { uri } = await Filesystem.writeFile({ path: PDF_NAME, data, directory: Directory.Cache })
    try {
      await Share.share({ title: 'Summary for my doctor', files: [uri], dialogTitle: 'Share the summary' })
    } catch (err) {
      if (!/cancel/i.test(err?.message ?? '')) throw err
      return 'cancelled'
    }
    return 'shared'
  }
  doc.save(PDF_NAME)
  return 'downloaded'
}
