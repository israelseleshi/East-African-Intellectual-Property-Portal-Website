/**
 * Export Logger - Captures all export operations and logs to file + backend
 */

export interface ExportLogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
  details?: Record<string, any>
}

class ExportLogger {
  private logs: ExportLogEntry[] = []
  private startTime: number = Date.now()

  log(message: string, details?: Record<string, any>) {
    this.addEntry('info', message, details)
  }

  warn(message: string, details?: Record<string, any>) {
    this.addEntry('warn', message, details)
  }

  error(message: string, details?: Record<string, any>) {
    this.addEntry('error', message, details)
  }

  success(message: string, details?: Record<string, any>) {
    this.addEntry('success', message, details)
  }

  private addEntry(level: ExportLogEntry['level'], message: string, details?: Record<string, any>) {
    const entry: ExportLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details
    }
    this.logs.push(entry)
    
    // Also log to console
    const prefix = `[Export-${level.toUpperCase()}]`
    if (details) {
      console[level === 'error' ? 'error' : 'log'](prefix, message, details)
    } else {
      console[level === 'error' ? 'error' : 'log'](prefix, message)
    }
  }

  /**
   * Generate formatted log text
   */
  formatLogs(): string {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2)
    let text = `TRADEMARK EXPORT LOG\n`
    text += `Generated: ${new Date().toISOString()}\n`
    text += `Duration: ${duration}s\n`
    text += `Total Entries: ${this.logs.length}\n`
    text += `${'='.repeat(80)}\n\n`

    for (const entry of this.logs) {
      text += `[${entry.timestamp}] ${entry.level.toUpperCase().padEnd(7)} ${entry.message}\n`
      if (entry.details && Object.keys(entry.details).length > 0) {
        text += `  Details: ${JSON.stringify(entry.details, null, 2)}\n`
      }
    }

    return text
  }

  /**
   * Get logs as JSON
   */
  getLogsAsJSON(): ExportLogEntry[] {
    return this.logs
  }

  /**
   * Download logs as text file
   */
  downloadAsFile(filename: string = 'export-logs.txt') {
    const content = this.formatLogs()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Send logs to backend
   */
  async sendToBackend(apiUrl: string = '/prod-api/logs/export'): Promise<boolean> {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: this.logs,
          formatted: this.formatLogs(),
          duration: (Date.now() - this.startTime) / 1000,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        this.log('Logs successfully sent to backend')
        return true
      } else {
        this.warn('Backend returned non-200 status', { status: response.status })
        return false
      }
    } catch (err) {
      this.error('Failed to send logs to backend', { error: String(err) })
      return false
    }
  }

  /**
   * Clear logs
   */
  clear() {
    this.logs = []
    this.startTime = Date.now()
  }
}

// ── Fetch Monitoring ──────────────────────────────────────────────

let originalFetch: typeof window.fetch | null = null
let fetchLogger: ExportLogger | null = null

/**
 * Patch window.fetch to log every network request through the ExportLogger.
 * Captures: URL, method, status, timing, content-length, and errors.
 */
export function patchFetch(logger: ExportLogger) {
  if (originalFetch) return // already patched
  originalFetch = window.fetch
  fetchLogger = logger

  const patchedFetch: typeof window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : (input as any).href
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const startTime = performance.now()

    logger.log(`[NET] ${method} ${url}`)

    try {
      const response = await originalFetch!(input, init)
      const duration = (performance.now() - startTime).toFixed(0)
      const cl = response.headers.get('content-length')
      const size = cl ? `${(+cl / 1024).toFixed(1)}KB` : '?'

      logger.log(`[NET] ${response.status} ${method} ${url} (${duration}ms, ${size})`)

      return response
    } catch (err) {
      const duration = (performance.now() - startTime).toFixed(0)
      logger.error(`[NET] FAILED ${method} ${url} (${duration}ms)`, { error: String(err) })
      throw err
    }
  }
  window.fetch = patchedFetch
}

/** Restore original window.fetch */
export function unpatchFetch() {
  if (originalFetch) {
    window.fetch = originalFetch
    originalFetch = null
    fetchLogger = null
  }
}

// Export singleton instance
export const createExportLogger = () => new ExportLogger()
