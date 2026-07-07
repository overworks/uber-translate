import { translate } from '../lib/translate-client'
import { getSettings } from '../lib/settings'

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'CODE', 'PRE'])
const BATCH_SIZE = 40

/** 원문 복원을 위해 번역된 텍스트 노드와 원본을 보관 */
const originals = new Map<Text, string>()
let translating = false

function collectTextNodes(): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const text = node.nodeValue ?? ''
      if (!text.trim()) return NodeFilter.FILTER_REJECT
      const parent = node.parentElement
      if (!parent) return NodeFilter.FILTER_REJECT
      if (SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT
      if (parent.isContentEditable) return NodeFilter.FILTER_REJECT
      if (parent.closest('#uber-translate-root')) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let n = walker.nextNode()
  while (n) {
    nodes.push(n as Text)
    n = walker.nextNode()
  }
  return nodes
}

function setStatus(text: string, isError = false) {
  let el = document.getElementById('uber-translate-status')
  if (!el) {
    el = document.createElement('div')
    el.id = 'uber-translate-status'
    el.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#202124;color:#e8eaed;' +
      'padding:8px 12px;border-radius:8px;font:500 12px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.35);'
    document.documentElement.appendChild(el)
  }
  el.style.background = isError ? '#5c1d1d' : '#202124'
  el.textContent = text
}

function clearStatus(delay = 1500) {
  setTimeout(() => document.getElementById('uber-translate-status')?.remove(), delay)
}

export async function translatePage(): Promise<void> {
  if (translating) return
  translating = true
  try {
    const settings = await getSettings()
    const nodes = collectTextNodes().filter((n) => !originals.has(n))
    if (nodes.length === 0) {
      setStatus('번역할 텍스트가 없습니다.')
      clearStatus()
      return
    }
    setStatus(`번역 중… 0/${nodes.length}`)

    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE)
      const texts = batch.map((n) => n.nodeValue ?? '')
      const { translations } = await translate(
        { text: texts, source: settings.sourceLang, target: settings.targetLang },
        settings,
      )
      batch.forEach((node, j) => {
        const translated = translations[j]
        if (translated == null) return
        originals.set(node, node.nodeValue ?? '')
        node.nodeValue = translated
      })
      setStatus(`번역 중… ${Math.min(i + BATCH_SIZE, nodes.length)}/${nodes.length}`)
    }
    setStatus('번역 완료 ✓')
    clearStatus()
  } catch (e) {
    setStatus(e instanceof Error ? e.message : String(e), true)
    clearStatus(4000)
  } finally {
    translating = false
  }
}

export function restorePage(): void {
  for (const [node, original] of originals) {
    node.nodeValue = original
  }
  originals.clear()
  setStatus('원문 복원 완료 ✓')
  clearStatus()
}
