// Renders every <pre class="mermaid"> block on the page, matching the reader's light or dark mode.
// Loaded as a classic script (not a module) so the pages also work when opened straight from disk.
(function renderDiagrams() {
  if (typeof window.mermaid === 'undefined') {
    document.querySelectorAll('pre.mermaid').forEach(function showSource(block) {
      block.insertAdjacentHTML(
        'beforebegin',
        '<p class="callout">The diagram library could not load (offline?). Showing the diagram source instead.</p>',
      )
    })
    return
  }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  window.mermaid.initialize({
    startOnLoad: true,
    theme: prefersDark ? 'dark' : 'neutral',
    securityLevel: 'strict',
    flowchart: { curve: 'basis', htmlLabels: true },
    themeVariables: { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' },
  })
})()
