// ==UserScript==
// @name         EAIP Network Capture
// @namespace    http://localhost:5173/
// @version      1.0
// @description  Auto-captures ALL network requests (fetch, XHR, JS, CSS, images, API) per page and downloads as .txt
// @author       opencode
// @match        http://localhost:5173/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict'

  const entries = []

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '?'
    if (bytes < 1024) return bytes + 'B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB'
    return (bytes / 1048576).toFixed(1) + 'MB'
  }

  function addEntry(method, url, status, durationMs, sizeBytes, error) {
    entries.push({
      timestamp: new Date().toISOString(),
      method,
      url,
      status: status || 'PENDING',
      duration: durationMs != null ? durationMs.toFixed(0) + 'ms' : '?',
      size: formatBytes(sizeBytes),
      error: error || '',
    })
  }

  // --- Patch fetch ---
  const origFetch = window.fetch
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.url
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const start = performance.now()
    addEntry(method, url, null, null, null)
    try {
      const res = await origFetch.call(window, input, init)
      const dur = performance.now() - start
      const cl = res.headers.get('content-length')
      addEntry(method, url, res.status, dur, cl ? +cl : 0)
      return res
    } catch (err) {
      const dur = performance.now() - start
      addEntry(method, url, 'FAILED', dur, 0, String(err))
      throw err
    }
  }

  // --- Patch XMLHttpRequest ---
  const origOpen = XMLHttpRequest.prototype.open
  const origSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function (method, url) {
    this._xurl = typeof url === 'string' ? url : url.toString()
    this._xmethod = method.toUpperCase()
    this._xstart = 0
    return origOpen.apply(this, arguments)
  }
  XMLHttpRequest.prototype.send = function () {
    this._xstart = performance.now()
    addEntry(this._xmethod, this._xurl, null, null, null)
    this.addEventListener('loadend', () => {
      const dur = performance.now() - this._xstart
      const cl = this.getResponseHeader('content-length')
      addEntry(this._xmethod, this._xurl, this.status, dur, cl ? +cl : 0)
    })
    this.addEventListener('error', () => {
      const dur = performance.now() - this._xstart
      addEntry(this._xmethod, this._xurl, 'FAILED', dur, 0, 'XHR error')
    })
    return origSend.apply(this, arguments)
  }

  // --- Dump to file ---
  function downloadLog() {
    if (entries.length === 0) return

    // Also grab Performance API entries (JS, CSS, images loaded before patch)
    const perfResources = performance.getEntriesByType
      ? performance.getEntriesByType('resource')
      : []
    const perfMap = new Map()
    for (const e of perfResources) {
      perfMap.set(e.name, {
        duration: e.duration ? e.duration.toFixed(0) + 'ms' : '?',
        size: formatBytes(e.transferSize || e.encodedBodySize || 0),
        type: e.initiatorType || '?',
      })
    }

    const path = window.location.pathname + window.location.search || '/'
    const filename =
      'NETWORK_' +
      path.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') +
      '_' +
      new Date().toISOString().split('T')[0] +
      '.txt'

    let text = 'NETWORK CAPTURE LOG\n'
    text += 'Page: ' + path + '\n'
    text += 'Generated: ' + new Date().toISOString() + '\n'
    text += 'Total Requests: ' + entries.length + '\n'
    text += 'Performance API entries: ' + perfResources.length + '\n'
    text += '='.repeat(80) + '\n\n'

    // Merged list
    const all = new Map()
    for (const e of entries) {
      all.set(e.url, e)
    }
    for (const e of perfResources) {
      if (!all.has(e.name)) {
        all.set(e.name, {
          timestamp: '?',
          method: e.initiatorType?.toUpperCase() || 'GET',
          url: e.name,
          status: e.transferSize !== undefined && e.transferSize > 0 ? 200 : (e.transferSize === 0 ? 200 : 'CACHED'),
          duration: e.duration ? e.duration.toFixed(0) + 'ms' : '?',
          size: formatBytes(e.transferSize || e.encodedBodySize || 0),
          error: '',
        })
      }
    }

    for (const [url, e] of all) {
      text += `[${e.timestamp}] ${e.method} ${e.status} ${url} (${e.duration}, ${e.size})`
      if (e.error) text += ' ERROR: ' + e.error
      text += '\n'
    }

    text += '\n' + '='.repeat(80) + '\n'
    text += 'END OF LOG\n'

    const blob = new Blob([text], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blob)
  }

  // Auto-download on page fully loaded
  window.addEventListener('load', () => {
    setTimeout(downloadLog, 2000)
  })

  // For SPA route changes, detect and redownload
  let lastUrl = location.href
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      entries.length = 0
      setTimeout(downloadLog, 3000)
    }
  })
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true })
})()
