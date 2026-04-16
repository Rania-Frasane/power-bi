/**
 * Export service for exporting dashboards in multiple formats
 */

export interface ExportOptions {
  filename?: string
  includeFilters?: boolean
  format?: 'csv' | 'json' | 'html'
}

/**
 * Export data as CSV
 */
export function exportAsCSV(
  data: any[],
  filename: string = 'export.csv'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  // Get columns from first row
  const columns = Object.keys(data[0])

  // Create CSV header
  const csvContent = [
    columns.map((col) => `"${col}"`).join(','),
    ...data.map((row) =>
      columns
        .map((col) => {
          const value = row[col]
          if (value === null || value === undefined) {
            return ''
          }
          // Escape quotes
          const stringValue = String(value).replace(/"/g, '""')
          return `"${stringValue}"`
        })
        .join(',')
    ),
  ].join('\n')

  // Download file
  downloadFile(csvContent, filename, 'text/csv')
}

/**
 * Export data as JSON
 */
export function exportAsJSON(
  data: any[],
  filename: string = 'export.json',
  pretty: boolean = true
): void {
  const jsonContent = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  downloadFile(jsonContent, filename, 'application/json')
}

/**
 * Export multiple datasets as combined JSON
 */
export function exportDashboardAsJSON(
  dashboardData: {
    name: string
    description: string
    widgets: any[]
    data: Record<string, any[]>
  },
  filename: string = 'dashboard-export.json'
): void {
  const jsonContent = JSON.stringify(dashboardData, null, 2)
  downloadFile(jsonContent, filename, 'application/json')
}

/**
 * Export data as HTML table
 */
export function exportAsHTML(
  data: any[],
  title: string = 'Data Export',
  filename: string = 'export.html'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }

  const columns = Object.keys(data[0])

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th {
      background: #f5f5f5;
      padding: 12px;
      text-align: left;
      border-bottom: 2px solid #ddd;
      font-weight: 600;
      color: #333;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #eee;
    }
    tr:nth-child(odd) {
      background: #fafafa;
    }
    tr:hover {
      background: #f0f0f0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">
      <p>Exported on ${new Date().toLocaleString()}</p>
      <p>Total records: ${data.length}</p>
    </div>
    <table>
      <thead>
        <tr>
          ${columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) =>
              `<tr>${columns
                .map((col) => `<td>${escapeHtml(String(row[col] || ''))}</td>`)
                .join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
  `.trim()

  downloadFile(htmlContent, filename, 'text/html')
}

/**
 * Export dashboard as images (requires additional library)
 */
export async function exportDashboardAsImages(
  dashboardId: number,
  widgetElements: HTMLElement[],
  filename: string = 'dashboard-export'
): Promise<void> {
  // This would require html2canvas or similar library
  // Implementation would capture widget screenshots
  console.warn('Image export requires additional setup')
}

/**
 * Download file helper
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

/**
 * Create a formatted filename with timestamp
 */
export function createExportFilename(
  baseName: string,
  extension: string = 'csv',
  includeTimestamp: boolean = true
): string {
  const name = baseName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const timestamp = includeTimestamp ? `_${Date.now()}` : ''
  return `${name}${timestamp}.${extension}`
}

/**
 * Get export format details
 */
export const EXPORT_FORMATS = {
  csv: {
    label: 'CSV (Spreadsheet)',
    description: 'Compatible with Excel and Google Sheets',
    extension: 'csv',
  },
  json: {
    label: 'JSON (Data Format)',
    description: 'Structured data format for applications',
    extension: 'json',
  },
  html: {
    label: 'HTML (Web Page)',
    description: 'Viewable in any web browser',
    extension: 'html',
  },
}
