import { translate } from '../lib/translate-client'
import { getSettings } from '../lib/settings'
import { addHistory } from '../lib/history'

const HOST_ID = 'uber-translate-root'

interface Ui {
  root: HTMLElement
  shadow: ShadowRoot
  button: HTMLButtonElement
  tooltip: HTMLDivElement
}

let ui: Ui | null = null

function ensureUi(): Ui {
  if (ui) return ui

  const root = document.createElement('div')
  root.id = HOST_ID
  root.style.cssText = 'all: initial; position: absolute; top: 0; left: 0; z-index: 2147483647;'
  const shadow = root.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    .ut-btn {
      position: absolute; display: none; cursor: pointer;
      background: #1a73e8; color: #fff; border: none; border-radius: 6px;
      padding: 4px 8px; font: 500 12px/1.2 system-ui, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,.25);
    }
    .ut-btn:hover { background: #1667c8; }
    .ut-tip {
      position: absolute; display: none; max-width: 360px;
      background: #202124; color: #e8eaed; border-radius: 8px;
      padding: 10px 12px; font: 400 13px/1.5 system-ui, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,.35); white-space: pre-wrap;
    }
    .ut-tip .ut-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 6px; }
    .ut-tip .ut-meta { color: #9aa0a6; font-size: 11px; }
    .ut-tip .ut-copy {
      cursor: pointer; background: transparent; color: #8ab4f8;
      border: 1px solid #5f6368; border-radius: 5px; padding: 2px 8px;
      font: 500 11px/1.2 system-ui, sans-serif; flex: none;
    }
    .ut-tip .ut-copy:hover { background: rgba(138,180,248,.12); }
    .ut-tip.ut-error { background: #5c1d1d; color: #ffd7d7; }
  `
  shadow.appendChild(style)

  const button = document.createElement('button')
  button.className = 'ut-btn'
  button.textContent = '번역'
  shadow.appendChild(button)

  const tooltip = document.createElement('div')
  tooltip.className = 'ut-tip'
  shadow.appendChild(tooltip)

  document.documentElement.appendChild(root)

  ui = { root, shadow, button, tooltip }

  button.addEventListener('mousedown', (e) => e.preventDefault()) // 선택 해제 방지
  button.addEventListener('click', () => {
    const text = lastSelectionText
    hideButton()
    if (text) void runTranslation(text, lastSelectionRect)
  })

  // 다른 곳 클릭 시 UI 숨김
  document.addEventListener('mousedown', (e) => {
    const path = e.composedPath()
    if (!path.includes(root)) hide()
  })

  return ui
}

let lastSelectionText = ''
let lastSelectionRect: DOMRect | null = null

function pageXY(rect: DOMRect) {
  return { x: rect.left + window.scrollX, y: rect.top + window.scrollY, bottom: rect.bottom + window.scrollY }
}

function showButton(rect: DOMRect) {
  const { button } = ensureUi()
  const { x, bottom } = pageXY(rect)
  button.style.left = `${x}px`
  button.style.top = `${bottom + 6}px`
  button.style.display = 'block'
}

function hideButton() {
  if (ui) ui.button.style.display = 'none'
}

function hide() {
  hideButton()
  if (ui) ui.tooltip.style.display = 'none'
}

async function runTranslation(text: string, rect: DOMRect | null) {
  const { tooltip } = ensureUi()
  tooltip.classList.remove('ut-error')
  tooltip.textContent = '번역 중…'
  positionTooltip(rect)
  tooltip.style.display = 'block'
  try {
    const settings = await getSettings()
    const result = await translate(
      { text: [text], source: settings.sourceLang, target: settings.targetLang },
      settings,
    )
    const out = result.translations[0] ?? ''
    void addHistory({
      time: Date.now(),
      source: text,
      translated: out,
      sourceLang: settings.sourceLang,
      detectedSource: result.detectedSource,
      target: settings.targetLang,
      provider: settings.activeProvider,
    })
    tooltip.textContent = ''
    const body = document.createElement('div')
    body.textContent = out
    tooltip.appendChild(body)

    const foot = document.createElement('div')
    foot.className = 'ut-foot'
    const meta = document.createElement('span')
    meta.className = 'ut-meta'
    meta.textContent = `${result.detectedSource ?? settings.sourceLang} → ${settings.targetLang}`
    foot.appendChild(meta)

    const copy = document.createElement('button')
    copy.className = 'ut-copy'
    copy.textContent = '복사'
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(out)
        copy.textContent = '복사됨 ✓'
      } catch {
        copy.textContent = '복사 실패'
      }
      setTimeout(() => (copy.textContent = '복사'), 1200)
    })
    foot.appendChild(copy)
    tooltip.appendChild(foot)
  } catch (e) {
    tooltip.classList.add('ut-error')
    tooltip.textContent = e instanceof Error ? e.message : String(e)
  }
}

function positionTooltip(rect: DOMRect | null) {
  const { tooltip } = ensureUi()
  const r = rect ?? lastSelectionRect
  if (!r) return
  const { x, bottom } = pageXY(r)
  tooltip.style.left = `${x}px`
  tooltip.style.top = `${bottom + 6}px`
}

/** 선택 영역 감지 → 번역 버튼 노출 */
export function initSelection(): void {
  document.addEventListener('mouseup', (e) => {
    // 우리 UI 내부 클릭은 무시
    if (ui && e.composedPath().includes(ui.root)) return
    setTimeout(() => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      if (!text || !sel || sel.rangeCount === 0) {
        hideButton()
        return
      }
      lastSelectionText = text
      lastSelectionRect = sel.getRangeAt(0).getBoundingClientRect()
      showButton(lastSelectionRect)
    }, 0)
  })
}

/** 컨텍스트 메뉴 등에서 현재 선택 텍스트를 즉시 번역 */
export function translateCurrentSelection(): void {
  const sel = window.getSelection()
  const text = sel?.toString().trim() ?? ''
  if (!text || !sel || sel.rangeCount === 0) return
  const rect = sel.getRangeAt(0).getBoundingClientRect()
  void runTranslation(text, rect)
}
