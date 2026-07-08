import { translate } from '../lib/translate-client'
import { getSettings, saveSettings } from '../lib/settings'
import { LANGUAGES } from '../lib/languages'
import { PROVIDER_LABELS } from '../providers'
import type { PageMessage } from '../lib/messaging'
import { addHistory, getHistory, clearHistory, type HistoryEntry } from '../lib/history'
import { googleBadge } from '../lib/attribution'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const targetSel = $<HTMLSelectElement>('target')
const input = $<HTMLTextAreaElement>('input')
const result = $<HTMLDivElement>('result')
const resultWrap = $<HTMLDivElement>('resultWrap')
const copyBtn = $<HTMLButtonElement>('copy')
const copyLabel = copyBtn.querySelector('.copy-label') as HTMLSpanElement
const providerEl = $<HTMLSpanElement>('provider')
const attribution = $<HTMLDivElement>('attribution')

for (const lang of LANGUAGES) {
  const opt = document.createElement('option')
  opt.value = lang.code
  opt.textContent = lang.label
  targetSel.appendChild(opt)
}

async function init() {
  const settings = await getSettings()
  targetSel.value = settings.targetLang
  providerEl.textContent = PROVIDER_LABELS[settings.activeProvider]
  // Google 사용 시 결과 인접 어트리뷰션 배지 표시 (Google 요구사항)
  if (settings.activeProvider === 'google') {
    attribution.replaceChildren(googleBadge('color'))
    attribution.classList.remove('hidden')
  }
}
void init()

// 대상 언어 변경 시 기본값으로 저장
targetSel.addEventListener('change', async () => {
  const settings = await getSettings()
  settings.targetLang = targetSel.value
  await saveSettings(settings)
})

function showResult(text: string, { isError = false, copyable = false } = {}) {
  result.textContent = text
  result.classList.toggle('error', isError)
  resultWrap.classList.toggle('has-result', copyable)
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(result.textContent ?? '')
    copyLabel.textContent = '복사됨 ✓'
    setTimeout(() => (copyLabel.textContent = '복사'), 1200)
  } catch {
    copyLabel.textContent = '복사 실패'
    setTimeout(() => (copyLabel.textContent = '복사'), 1200)
  }
})

$<HTMLButtonElement>('translate').addEventListener('click', async () => {
  const text = input.value.trim()
  if (!text) return
  showResult('번역 중…')
  try {
    const settings = await getSettings()
    const res = await translate(
      { text: [text], source: settings.sourceLang, target: targetSel.value },
      settings,
    )
    const out = res.translations[0] ?? ''
    showResult(out, { copyable: out.length > 0 })
    if (out) {
      void addHistory({
        time: Date.now(),
        source: text,
        translated: out,
        sourceLang: settings.sourceLang,
        detectedSource: res.detectedSource,
        target: targetSel.value,
        provider: settings.activeProvider,
      })
    }
  } catch (e) {
    showResult(e instanceof Error ? e.message : String(e), { isError: true })
  }
})

async function sendToPage(msg: PageMessage) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id == null) return
  try {
    await chrome.tabs.sendMessage(tab.id, msg)
  } catch {
    showResult('이 페이지에서는 실행할 수 없습니다 (내부 페이지일 수 있음).', { isError: true })
  }
}

$<HTMLButtonElement>('translatePage').addEventListener('click', () => {
  void sendToPage({ type: 'page:translate' })
  window.close()
})
$<HTMLButtonElement>('restorePage').addEventListener('click', () => {
  void sendToPage({ type: 'page:restore' })
  window.close()
})
$<HTMLAnchorElement>('openOptions').addEventListener('click', () => chrome.runtime.openOptionsPage())

// ── 번역 이력 ──────────────────────────────────────────────
const historyPanel = $<HTMLDivElement>('historyPanel')
const historyList = $<HTMLDivElement>('historyList')
const langLabel = (code: string) =>
  code === 'auto' ? 'auto' : (LANGUAGES.find((l) => l.code === code)?.label ?? code)

function renderHistory(entries: HistoryEntry[]) {
  historyList.textContent = ''
  if (entries.length === 0) {
    const empty = document.createElement('div')
    empty.className = 'hist-empty'
    empty.textContent = '아직 번역 이력이 없습니다.'
    historyList.appendChild(empty)
    return
  }
  for (const e of entries) {
    const item = document.createElement('div')
    item.className = 'hist-item'
    item.title = '클릭하면 위에 불러옵니다'

    const dst = document.createElement('div')
    dst.className = 'hist-dst'
    dst.textContent = e.translated
    const src = document.createElement('div')
    src.className = 'hist-src'
    src.textContent = e.source
    const meta = document.createElement('div')
    meta.className = 'hist-meta'
    meta.textContent = `${langLabel(e.detectedSource ?? e.sourceLang)} → ${langLabel(e.target)} · ${
      PROVIDER_LABELS[e.provider]
    }`

    item.append(dst, src, meta)
    // 항목 클릭 → 원문·번역을 상단으로 불러오기
    item.addEventListener('click', () => {
      input.value = e.source
      targetSel.value = e.target
      showResult(e.translated, { copyable: e.translated.length > 0 })
      historyPanel.classList.add('hidden')
    })
    historyList.appendChild(item)
  }
}

async function toggleHistory() {
  const willShow = historyPanel.classList.contains('hidden')
  if (willShow) renderHistory(await getHistory())
  historyPanel.classList.toggle('hidden')
}

$<HTMLAnchorElement>('toggleHistory').addEventListener('click', () => void toggleHistory())
$<HTMLAnchorElement>('clearHistory').addEventListener('click', async () => {
  await clearHistory()
  renderHistory([])
})
