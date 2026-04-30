import type {
  AnalysisChartSpec,
  DatasetAnalysis,
} from '@/lib/dataset-analysis-types'

export type DatasetHistoryRow = {
  id: number
  name: string
  description: string
  source_type: string
  row_count: number
  created_at: string
}

const MAX_CHART_DATA_ROWS = 60

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function renderGenericDataTable(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '<p><em>No rows</em></p>'
  const keys = Object.keys(rows[0])
  const head = keys.map((k) => `<th>${escapeHtml(k)}</th>`).join('')
  const body = rows
    .map(
      (row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(cellText(row[k]))}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<table class="data-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function renderTableChart(chart: AnalysisChartSpec): string {
  const keys = chart.mapping.columnKeys
  if (!Array.isArray(keys) || keys.length === 0) {
    return renderGenericDataTable(chart.data.slice(0, MAX_CHART_DATA_ROWS))
  }
  const rows = chart.data.slice(0, MAX_CHART_DATA_ROWS)
  if (!rows.length) return '<p><em>No rows</em></p>'
  const head = keys.map((k) => `<th>${escapeHtml(k)}</th>`).join('')
  const body = rows
    .map(
      (row) =>
        `<tr>${keys.map((k) => `<td>${escapeHtml(cellText(row[k]))}</td>`).join('')}</tr>`,
    )
    .join('')
  return `<table class="data-grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function renderChartBlock(chart: AnalysisChartSpec, chartIndex: number): string {
  const title = chart.title || chart.id || `Chart ${chartIndex + 1}`
  const raw = Array.isArray(chart.data) ? chart.data : []
  const capped = raw.slice(0, MAX_CHART_DATA_ROWS)

  let inner: string
  if (chart.type === 'table') {
    inner = renderTableChart({ ...chart, data: capped })
  } else {
    inner = `<p class="chart-kind"><strong>${escapeHtml(chart.type)}</strong> (tabular export)</p>${renderGenericDataTable(capped as Record<string, unknown>[])}`
  }

  return `
  <div class="chart-block">
    <h4>${escapeHtml(title)}</h4>
    ${inner}
    ${raw.length > MAX_CHART_DATA_ROWS ? `<p class="note">Showing first ${MAX_CHART_DATA_ROWS} rows of ${raw.length}.</p>` : ''}
  </div>`
}

function renderColumnProfiles(columns: unknown): string {
  if (!Array.isArray(columns) || columns.length === 0) return ''
  const rows = columns
    .map((c) => {
      if (!c || typeof c !== 'object') return ''
      const o = c as Record<string, unknown>
      const name = escapeHtml(String(o.name ?? ''))
      const typ = escapeHtml(String(o.inferredType ?? o.pandasDtype ?? ''))
      const nullPct =
        o.nullPct !== undefined && o.nullPct !== null
          ? escapeHtml(String(o.nullPct))
          : '—'
      const distinct =
        o.distinctCount !== undefined && o.distinctCount !== null
          ? escapeHtml(String(o.distinctCount))
          : '—'
      if (!name) return ''
      return `<tr><td>${name}</td><td>${typ}</td><td class="num">${nullPct}</td><td class="num">${distinct}</td></tr>`
    })
    .filter(Boolean)
    .join('')

  if (!rows) return ''

  return `
  <h4>Column profiles</h4>
  <table class="data-grid">
    <thead><tr><th>Column</th><th>Type</th><th>Null %</th><th>Distinct</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`
}

function renderAnalysisSection(
  dataset: DatasetHistoryRow,
  analysis: DatasetAnalysis | null | undefined,
): string {
  if (!analysis || (!analysis.metrics && !analysis.insights?.length && !analysis.charts?.length)) {
    return '<p class="muted"><em>No saved analysis for this dataset yet (upload or refresh to generate).</em></p>'
  }

  const metrics = analysis.metrics
  let metricsHtml = ''
  if (metrics && typeof metrics === 'object') {
    const parts: string[] = []
    if (typeof metrics.rowCount === 'number')
      parts.push(`Rows: <strong>${metrics.rowCount.toLocaleString()}</strong>`)
    if (typeof metrics.columnCount === 'number')
      parts.push(`Columns: <strong>${metrics.columnCount}</strong>`)
    if (typeof metrics.duplicateRowCount === 'number')
      parts.push(`Duplicate rows: <strong>${metrics.duplicateRowCount}</strong>`)
    if (parts.length) metricsHtml = `<p class="metrics">${parts.join(' · ')}</p>`
  }

  const insights = (analysis.insights ?? [])
    .map((i) => `<li>${escapeHtml(i.text)}</li>`)
    .join('')
  const insightsHtml = insights
    ? `<h4>Key insights</h4><ul class="insights">${insights}</ul>`
    : ''

  const chartsHtml = (analysis.charts ?? [])
    .map((ch, idx) => renderChartBlock(ch, idx))
    .join('')

  const chartsSection = chartsHtml
    ? `<h4>Charts (data tables)</h4><div class="charts">${chartsHtml}</div>`
    : ''

  const colsHtml = renderColumnProfiles(analysis.columns)

  return `${metricsHtml}${colsHtml}${insightsHtml}${chartsSection}`
}

function shareBlockForDataset(dataset: DatasetHistoryRow, appOrigin: string): string {
  const base = appOrigin.replace(/\/$/, '')
  const datasetsUrl = `${base}/dashboard/datasets`
  const deep = `${datasetsUrl}#dataset-${dataset.id}`
  const safeHrefList = datasetsUrl.replace(/"/g, '%22')
  const safeHrefDeep = deep.replace(/"/g, '%22')
  return `
  <div class="share-box">
    <h4>Share &amp; open in app</h4>
    <ul>
      <li><a href="${safeHrefList}">All datasets</a></li>
      <li><a href="${safeHrefDeep}">Jump to this dataset (opens auto insights)</a> — uses <code>#dataset-${dataset.id}</code></li>
    </ul>
    <p class="muted small">Dashboard public sharing (if enabled) is managed from each dashboard’s share action in the app.</p>
  </div>`
}

const PORTFOLIO_STYLES = `
  body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 24px; color: #111; line-height: 1.45; }
  h1 { font-size: 1.6rem; margin-bottom: 0.35rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.5rem; page-break-after: avoid; }
  h3 { font-size: 1.1rem; margin-top: 0; margin-bottom: 0.35rem; }
  h4 { font-size: 0.95rem; margin: 1rem 0 0.4rem; page-break-after: avoid; }
  .meta, .muted { color: #555; font-size: 0.875rem; }
  .muted { margin: 0.25rem 0; }
  .small { font-size: 0.8rem; }
  .dataset-section {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 16px 18px;
    margin-bottom: 1.75rem;
    page-break-inside: avoid;
  }
  .share-box { background: #f8f9fb; padding: 12px 14px; border-radius: 6px; margin: 12px 0; border: 1px solid #e2e6ee; }
  .share-box ul { margin: 0.35rem 0 0 1.1rem; }
  .share-box a { color: #0b57d0; }
  .metrics { font-size: 0.9rem; margin: 0.5rem 0 1rem; }
  ul.insights { margin: 0.25rem 0 0.75rem 1.2rem; }
  .charts { display: flex; flex-direction: column; gap: 1rem; }
  .chart-block { page-break-inside: avoid; }
  .chart-kind { margin: 0 0 0.35rem; font-size: 0.85rem; }
  .note { font-size: 0.8rem; color: #666; margin: 0.35rem 0 0; }
  table.data-grid, table.summary { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin: 0.35rem 0 1rem; }
  table.data-grid th, table.data-grid td, table.summary th, table.summary td {
    border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top;
  }
  table.data-grid th, table.summary th { background: #f0f0f0; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  code { font-size: 0.85em; background: #eee; padding: 0 4px; border-radius: 3px; }
  @media print {
    body { margin: 10px; }
    a { color: #000; text-decoration: underline; }
    .print-hide { display: none; }
  }
`

/**
 * Full report: history summary + per-dataset share links, metrics, column profiles,
 * insights, and chart data as HTML tables (suitable for download and Print → PDF).
 */
export function buildDatasetPortfolioHtml(
  datasets: DatasetHistoryRow[],
  analysesByDatasetId: Map<number, DatasetAnalysis | null | undefined>,
  options: { appOrigin: string; title?: string; generatedAt?: Date },
): string {
  const title = options.title ?? 'Dataset portfolio & analysis export'
  const generated = (options.generatedAt ?? new Date()).toLocaleString()
  const origin = options.appOrigin.replace(/\/$/, '')

  const sorted = [...datasets].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  const summaryRows = sorted
    .map(
      (d) => `
    <tr>
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(String(d.source_type).toUpperCase())}</td>
      <td class="num">${Number(d.row_count).toLocaleString()}</td>
      <td>${formatDate(d.created_at)}</td>
      <td>${escapeHtml(d.description || '—')}</td>
    </tr>`,
    )
    .join('')

  const sections = sorted
    .map((d) => {
      const analysis = analysesByDatasetId.get(d.id)
      return `
    <section class="dataset-section" id="export-dataset-${d.id}">
      <h2>${escapeHtml(d.name)}</h2>
      <p class="meta">ID ${d.id} · ${escapeHtml(String(d.source_type).toUpperCase())} · ${Number(d.row_count).toLocaleString()} rows · uploaded ${formatDate(d.created_at)}</p>
      <p class="meta">${escapeHtml(d.description || 'No description')}</p>
      ${shareBlockForDataset(d, origin)}
      <h3>Auto analysis snapshot</h3>
      ${renderAnalysisSection(d, analysis ?? null)}
    </section>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PORTFOLIO_STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated: ${escapeHtml(generated)} · ${sorted.length} dataset(s)</p>
  <p class="meta print-hide"><strong>PDF:</strong> File → Print → Save as PDF (or Microsoft Print to PDF).</p>

  <h2>Upload history (summary)</h2>
  <table class="summary">
    <thead>
      <tr><th>Name</th><th>Type</th><th>Rows</th><th>Uploaded</th><th>Description</th></tr>
    </thead>
    <tbody>${summaryRows || '<tr><td colspan="5">No datasets.</td></tr>'}</tbody>
  </table>

  ${sections}
</body>
</html>`
}

export function buildSingleDatasetReportHtml(
  dataset: DatasetHistoryRow,
  analysis: DatasetAnalysis | null | undefined,
  options: { appOrigin: string; title?: string; generatedAt?: Date; logoUrl?: string },
): string {
  const title = options.title ?? `Dataset report — ${dataset.name}`
  const generated = (options.generatedAt ?? new Date()).toLocaleString()
  const origin = options.appOrigin.replace(/\/$/, '')
  const logo = options.logoUrl
    ? `<img src="${escapeHtml(options.logoUrl)}" alt="Logo" style="height:28px;width:auto;object-fit:contain;" />`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${PORTFOLIO_STYLES}</style>
</head>
<body>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
    <h1>${escapeHtml(title)}</h1>
    ${logo}
  </div>
  <p class="meta">Generated: ${escapeHtml(generated)}</p>

  <section class="dataset-section" id="export-dataset-${dataset.id}">
    <h2>${escapeHtml(dataset.name)}</h2>
    <p class="meta">ID ${dataset.id} · ${escapeHtml(String(dataset.source_type).toUpperCase())} · ${Number(dataset.row_count).toLocaleString()} rows · uploaded ${formatDate(dataset.created_at)}</p>
    <p class="meta">${escapeHtml(dataset.description || 'No description')}</p>
    ${shareBlockForDataset(dataset, origin)}
    <h3>Auto analysis snapshot</h3>
    ${renderAnalysisSection(dataset, analysis ?? null)}
  </section>

  <p class="meta" style="margin-top:20px;border-top:1px solid #ddd;padding-top:8px;">
    Export date: ${escapeHtml(generated)}
  </p>
</body>
</html>`
}

/**
 * Full HTML document: upload history table only (legacy / lightweight).
 */
export function buildDatasetHistoryDocument(
  datasets: DatasetHistoryRow[],
  options?: { title?: string; generatedAt?: Date },
): string {
  const title = options?.title ?? 'Dataset upload history'
  const generated = (options?.generatedAt ?? new Date()).toLocaleString()

  const rows = [...datasets]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map(
      (d) => `
    <tr>
      <td>${escapeHtml(d.name)}</td>
      <td>${escapeHtml(String(d.source_type).toUpperCase())}</td>
      <td class="num">${Number(d.row_count).toLocaleString()}</td>
      <td>${formatDate(d.created_at)}</td>
      <td>${escapeHtml(d.description || '—')}</td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, Roboto, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    .meta { color: #555; font-size: 0.875rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; font-weight: 600; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; }
    @media print {
      body { margin: 12px; }
      a.print-hide { display: none; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated: ${escapeHtml(generated)} · ${datasets.length} dataset(s)</p>
  <p class="meta print-hide"><strong>PDF:</strong> use your browser menu → Print → Save as PDF.</p>
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Type</th>
        <th>Rows</th>
        <th>Uploaded</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="5">No datasets.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`
}

export function downloadHtmlFile(filename: string, html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Opens a print-friendly window (user can Save as PDF from the print dialog). */
export function openHistoryPrintWindow(html: string): void {
  const w = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  window.setTimeout(() => {
    try {
      w.print()
    } catch {
      /* ignore */
    }
  }, 300)
}
