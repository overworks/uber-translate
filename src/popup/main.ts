import { translate } from '../lib/translate-client'
import { getSettings, saveSettings } from '../lib/settings'
import { LANGUAGES } from '../lib/languages'
import { PROVIDER_LABELS } from '../providers'
import type { PageMessage } from '../lib/messaging'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const targetSel = $<HTMLSelectElement>('target')
const input = $<HTMLTextAreaElement>('input')
const result = $<HTMLDivElement>('result')
const resultWrap = $<HTMLDivElement>('resultWrap')
const copyBtn = $<HTMLButtonElement>('copy')
const providerEl = $<HTMLSpanElement>('provider')

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
    const prev = copyBtn.textContent
    copyBtn.textContent = '복사됨 ✓'
    setTimeout(() => (copyBtn.textContent = prev), 1200)
  } catch {
    copyBtn.textContent = '복사 실패'
    setTimeout(() => (copyBtn.textContent = '복사'), 1200)
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
