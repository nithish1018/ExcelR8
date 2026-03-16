import { useState, useCallback } from 'react'

// Detect whether a row string is tab-separated or comma-separated
function detectSeparator(raw) {
  const tabCount = (raw.match(/\t/g) || []).length
  const commaCount = (raw.match(/,/g) || []).length
  return tabCount >= commaCount ? '\t' : ','
}

// Parse a raw row string into an array of cell values
function parseRow(raw, sep) {
  if (sep === '\t') return raw.split('\t').map(c => c.trim())
  // Simple CSV parse for commas (handles quoted fields)
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (ch === '"') { inQuotes = !inQuotes; continue }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

// Escape a cell value for CSV output
function escapeCSV(val) {
  if (val == null) return ''
  const str = String(val)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function rowToCSV(cells) {
  return cells.map(escapeCSV).join(',')
}

// Tab-separated — pastes correctly across columns in Excel
function rowToTSV(cells) {
  return cells.map(c => String(c ?? '').replace(/\t/g, ' ')).join('\t')
}

function App() {
  const [dataRow, setDataRow] = useState('')
  const [headerRow, setHeaderRow] = useState('')
  const [count, setCount] = useState('')
  const [csvOutput, setCsvOutput] = useState('')
  const [tsvOutput, setTsvOutput] = useState('')
  const [parsedCells, setParsedCells] = useState([])
  const [parsedHeaders, setParsedHeaders] = useState([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleDataRowChange = useCallback((e) => {
    const val = e.target.value
    setDataRow(val)
    setCsvOutput('')
    setError('')
    if (val.trim()) {
      const sep = detectSeparator(val)
      setParsedCells(parseRow(val, sep))
    } else {
      setParsedCells([])
    }
  }, [])

  const handleHeaderRowChange = useCallback((e) => {
    const val = e.target.value
    setHeaderRow(val)
    setCsvOutput('')
    if (val.trim()) {
      const sep = detectSeparator(val)
      setParsedHeaders(parseRow(val, sep))
    } else {
      setParsedHeaders([])
    }
  }, [])

  const generate = useCallback(() => {
    setError('')
    if (!dataRow.trim()) { setError('Please enter at least one row of data.'); return }
    const n = parseInt(count, 10)
    if (!n || n < 1) { setError('Please enter a valid number greater than 0.'); return }
    if (n > 100000) { setError('Maximum 100,000 rows allowed.'); return }

    const sep = detectSeparator(dataRow)
    const cells = parseRow(dataRow, sep)
    const csvDataRow = rowToCSV(cells)
    const tsvDataRow = rowToTSV(cells)

    const csvLines = []
    const tsvLines = []
    if (headerRow.trim()) {
      const hSep = detectSeparator(headerRow)
      const hCells = parseRow(headerRow, hSep)
      csvLines.push(rowToCSV(hCells))
      tsvLines.push(rowToTSV(hCells))
    }
    for (let i = 0; i < n; i++) {
      csvLines.push(csvDataRow)
      tsvLines.push(tsvDataRow)
    }

    setCsvOutput(csvLines.join('\n'))
    setTsvOutput(tsvLines.join('\n'))
  }, [dataRow, headerRow, count])

  // Copy TSV — pastes into Excel spreading across columns correctly
  const copyToClipboard = useCallback(() => {
    if (!tsvOutput) return
    navigator.clipboard.writeText(tsvOutput).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [tsvOutput])

  const downloadCSV = useCallback(() => {
    if (!csvOutput) return
    const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'duplicated_data.csv'
    a.click()
    URL.revokeObjectURL(url)
  }, [csvOutput])

  const reset = useCallback(() => {
    setDataRow(''); setHeaderRow(''); setCount(''); setCsvOutput(''); setTsvOutput('')
    setParsedCells([]); setParsedHeaders([]); setError(''); setCopied(false)
  }, [])

  const displayHeaders = parsedHeaders.length > 0 ? parsedHeaders : parsedCells.map((_, i) => `Column ${i + 1}`)
  const outputLineCount = csvOutput ? csvOutput.split('\n').length : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-bold text-sm">E</div>
          <div>
            <h1 className="text-lg font-semibold text-white leading-tight">Excel Row Duplicator</h1>
            <p className="text-xs text-gray-400">Paste a row, set a count — copy directly into Excel or download as CSV</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT â€” Inputs */}
        <div className="flex flex-col gap-6">

          {/* Step 1 â€” Header row */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="text-sm font-semibold text-gray-200">Header Row <span className="text-gray-500 font-normal">(optional)</span></h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Paste the header row from Excel or type column names separated by commas.</p>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              rows={2}
              placeholder="Name, Age, City, Country"
              value={headerRow}
              onChange={handleHeaderRowChange}
            />
            {parsedHeaders.length > 0 && (
              <p className="text-xs text-green-400 mt-2">{parsedHeaders.length} columns detected</p>
            )}
          </div>

          {/* Step 2 â€” Data row */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">2</span>
              <h2 className="text-sm font-semibold text-gray-200">Data Row <span className="text-red-400">*</span></h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">Paste a row copied from Excel (tab-separated) or enter values separated by commas.</p>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              rows={3}
              placeholder="John Doe	28	New York	USA"
              value={dataRow}
              onChange={handleDataRowChange}
            />
            {parsedCells.length > 0 && (
              <p className="text-xs text-violet-400 mt-2">{parsedCells.length} values detected &mdash; {detectSeparator(dataRow) === '\t' ? 'tab-separated (Excel paste)' : 'comma-separated'}</p>
            )}
          </div>

          {/* Step 3 â€” Count */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">3</span>
              <h2 className="text-sm font-semibold text-gray-200">Number of Rows <span className="text-red-400">*</span></h2>
            </div>
            <p className="text-xs text-gray-500 mb-3">How many times should this row be duplicated in the output?</p>
            <input
              type="number"
              min={1}
              max={100000}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              placeholder="e.g. 100"
              value={count}
              onChange={e => { setCount(e.target.value); setCsvOutput(''); setError('') }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={generate}
              className="flex-1 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm rounded-xl py-3 transition"
            >
              Generate CSV
            </button>
            <button
              onClick={reset}
              className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm rounded-xl py-3 transition"
            >
              Reset
            </button>
          </div>
        </div>

        {/* RIGHT â€” Preview & Output */}
        <div className="flex flex-col gap-6">

          {/* Data preview table */}
          {parsedCells.length > 0 && (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
              <h2 className="text-sm font-semibold text-gray-200 mb-3">Preview</h2>
              <div className="overflow-x-auto rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-800">
                      {displayHeaders.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left text-gray-400 font-medium border border-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-gray-850">
                      {parsedCells.map((c, i) => (
                        <td key={i} className="px-3 py-2 text-gray-200 border border-gray-700 whitespace-nowrap">{c}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {count && parseInt(count) > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  This row will be repeated <span className="text-violet-400 font-semibold">{parseInt(count).toLocaleString()}</span> times in the output.
                </p>
              )}
            </div>
          )}

          {/* CSV Output */}
          {csvOutput ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-200">
                  CSV Output
                  <span className="ml-2 text-xs text-gray-500 font-normal">{outputLineCount.toLocaleString()} line{outputLineCount !== 1 ? 's' : ''}</span>
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${copied ? 'bg-green-700 text-green-100' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}
                  >
                    {copied ? 'Copied!' : 'Copy for Excel'}
                  </button>
                  <button
                    onClick={downloadCSV}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-700 hover:bg-violet-600 text-white transition"
                  >
                    Download .csv
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-xs text-gray-300 font-mono resize-none focus:outline-none"
                rows={12}
                value={csvOutput}
              />
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400 flex flex-col gap-1">
                <p><span className="text-green-400 font-semibold">Copy for Excel</span> — copies tab-separated values. Select a cell in your existing sheet and press Ctrl+V. Each value will land in its own column.</p>
                <p><span className="text-violet-400 font-semibold">Download .csv</span> — saves a .csv file you can open directly in Excel as a new spreadsheet.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-dashed border-gray-700 p-10 flex flex-col items-center justify-center text-center gap-3 flex-1 min-h-48">
              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-600 text-xl">â¬‡</div>
              <p className="text-sm text-gray-500">Your CSV output will appear here after you click <span className="text-violet-400 font-medium">Generate CSV</span>.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
