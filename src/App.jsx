import { useState, useCallback, useEffect, useRef } from 'react'

// Detect whether a row string is tab-separated or comma-separated
function detectSeparator(raw) {
  const tabCount = (raw.match(/\t/g) || []).length
  const commaCount = (raw.match(/,/g) || []).length
  return tabCount >= commaCount ? '\t' : ','
}

// Parse a raw row string into an array of cell values
function parseRow(raw, sep) {
  if (sep === '\t') return raw.split('\t').map((c) => c.trim())

  // Simple CSV parse for commas (handles quoted fields)
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]

    if (ch === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += ch
  }

  result.push(current.trim())
  return result
}

function parseRows(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseRow(line, detectSeparator(line)))
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

// Tab-separated output pastes correctly across columns in Excel
function rowToTSV(cells) {
  return cells.map((c) => String(c ?? '').replace(/\t/g, ' ')).join('\t')
}

function App() {
  const cursorDotRef = useRef(null)
  const cursorRingRef = useRef(null)
  const generateButtonRef = useRef(null)
  const generateHighlightTimeoutRef = useRef(null)
  const [customCursorEnabled, setCustomCursorEnabled] = useState(false)
  const [showHeaderRow, setShowHeaderRow] = useState(false)
  const [isGenerateHighlighted, setIsGenerateHighlighted] = useState(false)
  const [dataRows, setDataRows] = useState('')
  const [headerRow, setHeaderRow] = useState('')
  const [count, setCount] = useState('')
  const [csvOutput, setCsvOutput] = useState('')
  const [tsvOutput, setTsvOutput] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [parsedHeaders, setParsedHeaders] = useState([])
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleDataRowsChange = useCallback((e) => {
    const val = e.target.value
    setDataRows(val)
    setCsvOutput('')
    setTsvOutput('')
    setError('')

    if (val.trim()) {
      setParsedRows(parseRows(val))
    } else {
      setParsedRows([])
    }
  }, [])

  const handleHeaderRowChange = useCallback((e) => {
    const val = e.target.value
    setHeaderRow(val)
    setCsvOutput('')
    setTsvOutput('')

    if (val.trim()) {
      const sep = detectSeparator(val)
      setParsedHeaders(parseRow(val, sep))
    } else {
      setParsedHeaders([])
    }
  }, [])

  const generate = useCallback(() => {
    setError('')

    if (!parsedRows.length) {
      setError('Please enter at least one row of data.')
      return
    }

    const n = parseInt(count, 10)
    if (!n || n < 1) {
      setError('Please enter a valid number greater than 0.')
      return
    }

    if (n > 100000) {
      setError('Maximum duplication count is 100,000.')
      return
    }

    const totalGeneratedRows = parsedRows.length * n
    if (totalGeneratedRows > 200000) {
      setError('Total generated rows cannot exceed 200,000.')
      return
    }

    const csvLines = []
    const tsvLines = []

    if (headerRow.trim()) {
      const hSep = detectSeparator(headerRow)
      const hCells = parseRow(headerRow, hSep)
      csvLines.push(rowToCSV(hCells))
      tsvLines.push(rowToTSV(hCells))
    }

    parsedRows.forEach((cells) => {
      const csvDataRow = rowToCSV(cells)
      const tsvDataRow = rowToTSV(cells)

      for (let i = 0; i < n; i++) {
        csvLines.push(csvDataRow)
        tsvLines.push(tsvDataRow)
      }
    })

    setCsvOutput(csvLines.join('\n'))
    setTsvOutput(tsvLines.join('\n'))
  }, [parsedRows, headerRow, count])

  // Copy TSV so paste works directly into existing Excel columns
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

  const focusGenerateButton = useCallback(() => {
    const button = generateButtonRef.current
    if (!button) return

    button.scrollIntoView({ behavior: 'smooth', block: 'center' })
    button.focus({ preventScroll: true })
    setIsGenerateHighlighted(true)

    if (generateHighlightTimeoutRef.current) {
      clearTimeout(generateHighlightTimeoutRef.current)
    }

    generateHighlightTimeoutRef.current = setTimeout(() => {
      setIsGenerateHighlighted(false)
    }, 1400)
  }, [])

  const reset = useCallback(() => {
    setShowHeaderRow(false)
    setDataRows('')
    setHeaderRow('')
    setCount('')
    setCsvOutput('')
    setTsvOutput('')
    setParsedRows([])
    setParsedHeaders([])
    setError('')
    setCopied(false)
  }, [])

  const maxPreviewColumns = parsedRows.reduce((max, row) => Math.max(max, row.length), 0)
  const displayHeaders = parsedHeaders.length > 0
    ? parsedHeaders
    : Array.from({ length: maxPreviewColumns }, (_, i) => `Column ${i + 1}`)
  const outputLineCount = csvOutput ? csvOutput.split('\n').length : 0
  const previewRows = parsedRows.slice(0, 6)
  const hasMorePreviewRows = parsedRows.length > 6
  const duplicateCount = Number.parseInt(count, 10)
  const quickCountOptions = [50, 100, 150, 200]
  const totalRowsEstimate = Number.isNaN(duplicateCount) ? 0 : parsedRows.length * duplicateCount

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    const updateCursorMode = () => setCustomCursorEnabled(mediaQuery.matches)

    updateCursorMode()
    mediaQuery.addEventListener('change', updateCursorMode)

    return () => {
      mediaQuery.removeEventListener('change', updateCursorMode)
    }
  }, [])

  useEffect(() => {
    if (!customCursorEnabled) {
      document.body.classList.remove('custom-cursor-enabled')
      return
    }

    document.body.classList.add('custom-cursor-enabled')

    const dot = cursorDotRef.current
    const ring = cursorRingRef.current
    const cursorModeClasses = ['cursor-mode-default', 'cursor-mode-interactive', 'cursor-mode-output', 'cursor-mode-count']

    if (!dot || !ring) return

    const applyCursorMode = (mode) => {
      cursorModeClasses.forEach((cls) => {
        ring.classList.remove(cls)
        dot.classList.remove(cls)
      })
      ring.classList.add(mode)
      dot.classList.add(mode)
    }

    const getCursorMode = (target) => {
      if (!(target instanceof Element)) return 'cursor-mode-default'
      if (target.closest('[data-cursor="count"]')) return 'cursor-mode-count'
      if (target.closest('[data-cursor="output"]')) return 'cursor-mode-output'
      if (target.closest('button, a, [role="button"]')) return 'cursor-mode-interactive'
      return 'cursor-mode-default'
    }

    applyCursorMode('cursor-mode-default')

    const updatePosition = (event) => {
      const x = event.clientX
      const y = event.clientY
      dot.style.transform = `translate(${x}px, ${y}px)`
      ring.style.transform = `translate(${x}px, ${y}px)`
      dot.style.opacity = '1'
      ring.style.opacity = '1'
      applyCursorMode(getCursorMode(event.target))
    }

    const handleMouseDown = () => {
      ring.classList.add('cursor-active')
    }

    const handleMouseUp = () => {
      ring.classList.remove('cursor-active')
    }

    const handleMouseLeave = (event) => {
      if (event.relatedTarget) return
      dot.style.opacity = '0'
      ring.style.opacity = '0'
    }

    window.addEventListener('mousemove', updatePosition)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('mouseout', handleMouseLeave)

    return () => {
      document.body.classList.remove('custom-cursor-enabled')
      window.removeEventListener('mousemove', updatePosition)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mouseout', handleMouseLeave)
    }
  }, [customCursorEnabled])

  useEffect(() => {
    return () => {
      if (generateHighlightTimeoutRef.current) {
        clearTimeout(generateHighlightTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      <header className="border-b border-gray-800/80 bg-gray-900/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <img
            src="/favicon.svg"
            alt="ExcelR8 logo"
            className="w-8 h-8 rounded-lg"
          />
          <div>
            <h1 className="text-2xl md:text-[1.9rem] font-bold tracking-[-0.03em] leading-none text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
              ExcelR8
            </h1>
            <p className="text-xs text-gray-400">Paste one row or many rows, set a count, then copy directly into Excel or download CSV</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="flex flex-col gap-5">
          {!showHeaderRow ? (
            <button
              type="button"
              onClick={() => setShowHeaderRow(true)}
              className="w-full bg-gray-900/70 rounded-2xl border border-dashed border-gray-700 p-4 text-left text-sm text-gray-300 hover:border-violet-500/70 hover:text-violet-300 transition"
            >
              + Add Optional Header Row
            </button>
          ) : (
            <div className="bg-gray-900/85 rounded-2xl border border-gray-700/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center">H</span>
                  <h2 className="text-sm font-semibold text-gray-200">Header Row <span className="text-gray-500 font-normal">(optional)</span></h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderRow(false)
                    setHeaderRow('')
                    setParsedHeaders([])
                    setCsvOutput('')
                    setTsvOutput('')
                  }}
                  className="text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  Hide
                </button>
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
          )}

          <div className="bg-gray-900/85 rounded-2xl border border-gray-700/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-md bg-violet-500/15 border border-violet-400/30 text-violet-300 text-[11px] font-bold flex items-center justify-center">D</span>
              <p className="text-[11px] uppercase tracking-[0.12em] text-violet-300/90 font-semibold">Data Rows</p>
              <span className="text-red-400 text-xs">*</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Paste one row or multiple rows from Excel. Every new line is treated as a separate source row.</p>
            <div className="mb-3 rounded-xl border border-violet-700/50 bg-violet-950/30 px-3 py-2 text-xs text-violet-200">
              <p className="font-semibold">How to add multiple rows</p>
              <p className="mt-1 text-violet-200/90">Option 1: Paste multiple rows copied from Excel.</p>
              <p className="text-violet-200/90">Option 2: Type rows manually, one row per line.</p>
            </div>
            <textarea
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              rows={8}
              placeholder={'Row 1: John Doe\t28\tNew York\tUSA\nRow 2: Jane Smith\t31\tLondon\tUK\nRow 3: Alex\t26\tChennai\tIndia'}
              value={dataRows}
              onChange={handleDataRowsChange}
            />
            {parsedRows.length > 0 && (
              <p className="text-xs text-violet-400 mt-2">{parsedRows.length} source rows detected. All rows will be duplicated.</p>
            )}
          </div>

          <div className="bg-gray-900/85 rounded-2xl border border-gray-700/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-md bg-violet-500/15 border border-violet-400/30 text-violet-300 text-[11px] font-bold flex items-center justify-center">C</span>
              <p className="text-[11px] uppercase tracking-[0.12em] text-violet-300/90 font-semibold">Duplicate Count</p>
              <span className="text-red-400 text-xs">*</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Each source row will be repeated this many times. Example: 3 rows with count 5 gives 15 output rows.</p>
            <input
              type="number"
              data-cursor="count"
              min={1}
              max={100000}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
              placeholder="e.g. 100"
              value={count}
              onChange={(e) => {
                setCount(e.target.value)
                setCsvOutput('')
                setTsvOutput('')
                setError('')
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {quickCountOptions.map((value) => {
                const isActive = duplicateCount === value
                return (
                  <button
                    key={value}
                    type="button"
                    data-cursor="count"
                    onClick={() => {
                      setCount(String(value))
                      setCsvOutput('')
                      setTsvOutput('')
                      setError('')
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${isActive
                      ? 'bg-violet-600/25 border-violet-400 text-violet-200'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
            {parsedRows.length > 0 && duplicateCount > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {parsedRows.length.toLocaleString()} source rows x {duplicateCount.toLocaleString()} = {totalRowsEstimate.toLocaleString()} generated rows
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              ref={generateButtonRef}
              onClick={generate}
              className={`flex-1 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-semibold text-sm rounded-xl py-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${isGenerateHighlighted ? 'generate-focus-flash' : ''}`}
            >
              Generate Data
            </button>
            <button
              onClick={reset}
              className="px-5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-sm rounded-xl py-3 transition"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:sticky lg:top-6">
          {csvOutput ? (
            <div className="bg-gray-900/90 rounded-2xl border border-gray-700/70 p-5 flex flex-col gap-4 min-h-[24rem] max-h-[72vh] overflow-hidden shadow-[0_14px_38px_rgba(0,0,0,0.28)]">
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
              <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-gray-700 bg-gray-800">
                <textarea
                  readOnly
                  data-cursor="output"
                  className="w-full h-full min-h-[18rem] bg-transparent px-4 py-3 text-xs text-gray-300 font-mono resize-none focus:outline-none"
                  value={csvOutput}
                />
              </div>
              <div className="bg-gray-800 rounded-xl px-4 py-3 text-xs text-gray-400 flex flex-col gap-1">
                <p><span className="text-green-400 font-semibold">Copy for Excel</span> copies tab-separated values. Select a cell in your existing sheet and press Ctrl+V to spread values across columns.</p>
                <p><span className="text-violet-400 font-semibold">Download .csv</span> saves a .csv file you can open directly in Excel as a new spreadsheet.</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/90 rounded-2xl border border-dashed border-gray-700 p-10 flex flex-col items-center justify-center text-center gap-3 min-h-[24rem] overflow-hidden relative shadow-[0_14px_38px_rgba(0,0,0,0.28)]">
              <div className="csv-empty-sheet" aria-hidden="true">
                <div className="csv-empty-sheet-head">
                  <span>A</span>
                  <span>B</span>
                  <span>C</span>
                  <span>D</span>
                </div>
                <div className="csv-empty-sheet-body">
                  {[0, 1, 2, 3, 4].map((row) => (
                    <div key={row} className="csv-empty-sheet-row" style={{ animationDelay: `${row * 180}ms` }} />
                  ))}
                </div>
                <div className="csv-empty-sheet-scan" />
              </div>

              <p className="text-sm text-gray-400 csv-empty-text">
                Your CSV output will appear here after you click{' '}
                <button
                  type="button"
                  onClick={focusGenerateButton}
                  className="text-violet-400 font-medium hover:text-violet-300 underline decoration-violet-500/50 underline-offset-2 transition"
                >
                  Generate Data
                </button>
                .
              </p>
              <button
                type="button"
                onClick={focusGenerateButton}
                className="csv-empty-cta"
              >
              </button>
            </div>
          )}

          {parsedRows.length > 0 && (
            <div className="bg-gray-900/85 rounded-2xl border border-gray-700/70 p-5 shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
              <h2 className="text-sm font-semibold text-gray-200 mb-3">Preview (first {previewRows.length} row{previewRows.length !== 1 ? 's' : ''})</h2>
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
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="bg-gray-850">
                        {displayHeaders.map((_, colIndex) => (
                          <td key={colIndex} className="px-3 py-2 text-gray-200 border border-gray-700 whitespace-nowrap">{row[colIndex] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMorePreviewRows && (
                <p className="text-xs text-gray-500 mt-2">Showing first 6 rows out of {parsedRows.length.toLocaleString()} source rows.</p>
              )}
            </div>
          )}
        </div>
      </main>

      {customCursorEnabled && (
        <>
          <div ref={cursorRingRef} className="excelr8-cursor-ring" aria-hidden="true" />
          <div ref={cursorDotRef} className="excelr8-cursor-dot" aria-hidden="true" />
        </>
      )}
    </div>
  )
}

export default App
