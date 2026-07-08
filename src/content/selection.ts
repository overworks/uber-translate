import { translate } from '../lib/translate-client'
import { getSettings, onSettingsChanged, type ProviderId } from '../lib/settings'
import { addHistory } from '../lib/history'
import { attributionBadge } from '../lib/attribution'

// 플로팅 트리거 버튼/배지를 provider에 맞게 그리기 위해 활성 provider를 캐시.
let activeProvider: ProviderId = 'builtin'

const HOST_ID = 'uber-translate-root'

interface Ui {
  root: HTMLElement
  shadow: ShadowRoot
  button: HTMLButtonElement
  attrib: HTMLDivElement
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
      position: absolute; display: none; align-items: center; gap: 5px; cursor: pointer;
      background: linear-gradient(135deg, #6d6dff 0%, #5b5bd6 60%, #7c4dff 100%);
      color: #fff; border: none; border-radius: 8px;
      padding: 6px 11px; font: 600 12px/1.2 system-ui, -apple-system, sans-serif;
      box-shadow: 0 4px 14px rgba(91,91,214,.45); transition: transform .1s, box-shadow .15s;
    }
    .ut-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(91,91,214,.55); }
    .ut-btn:active { transform: translateY(0); }
    .ut-btn svg { width: 13px; height: 13px; }
    .ut-attrib {
      position: absolute; display: none; background: #191b22;
      padding: 5px 8px; border-radius: 7px; box-shadow: 0 2px 8px rgba(0,0,0,.3);
      border: 1px solid rgba(255,255,255,.08);
    }
    .ut-tip {
      position: absolute; display: none; max-width: 360px;
      background: #191b22; color: #e9eaee; border: 1px solid rgba(255,255,255,.08);
      border-radius: 12px; padding: 12px 14px;
      font: 400 13px/1.55 system-ui, -apple-system, sans-serif;
      box-shadow: 0 10px 34px rgba(0,0,0,.45); white-space: pre-wrap; word-break: break-word;
      animation: ut-fade .18s ease;
    }
    @keyframes ut-fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .ut-tip .ut-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 9px; padding-top: 9px; border-top: 1px solid rgba(255,255,255,.08); }
    .ut-tip .ut-meta { color: #9aa0ac; font: 600 10px/1 ui-monospace, "SF Mono", Menlo, monospace; letter-spacing: .3px; text-transform: uppercase; }
    .ut-tip .ut-copy {
      cursor: pointer; background: rgba(155,155,244,.14); color: #b3b3f7;
      border: 1px solid rgba(155,155,244,.3); border-radius: 7px; padding: 4px 10px;
      font: 600 11px/1.2 system-ui, sans-serif; flex: none; transition: background .15s;
    }
    .ut-tip .ut-copy:hover { background: rgba(155,155,244,.24); }
    .ut-tip.ut-error { background: #2a1618; border-color: rgba(255,99,105,.3); color: #ffc9cb; }
    @media (prefers-reduced-motion: reduce) { .ut-tip { animation: none; } .ut-btn { transition: none; } }
  `
  shadow.appendChild(style)

  const button = document.createElement('button')
  button.className = 'ut-btn'
  button.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7M9 3v2c0 4.4-2.7 8-6 8"/><path d="M5 9c0 2.5 3.6 4.5 6 4.5"/><path d="M13 21l4-9 4 9M14.5 17h5"/></svg>번역'
  shadow.appendChild(button)

  // Google/DeepL 사용 시 트리거 버튼 옆에 붙는 어트리뷰션 배지 (provider 요구사항)
  const attrib = document.createElement('div')
  attrib.className = 'ut-attrib'
  shadow.appendChild(attrib)

  const tooltip = document.createElement('div')
  tooltip.className = 'ut-tip'
  shadow.appendChild(tooltip)

  document.documentElement.appendChild(root)

  ui = { root, shadow, button, attrib, tooltip }

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
  const { button, attrib } = ensureUi()
  const { x, bottom } = pageXY(rect)
  button.style.left = `${x}px`
  button.style.top = `${bottom + 6}px`
  button.style.display = 'inline-flex'
  // Google/DeepL일 때만 트리거 옆에 어트리뷰션 배지 노출
  const badge = attributionBadge(activeProvider, 'white')
  if (badge) {
    attrib.replaceChildren(badge)
    attrib.style.left = `${x}px`
    attrib.style.top = `${bottom + 6 + button.offsetHeight + 5}px`
    attrib.style.display = 'block'
  } else {
    attrib.style.display = 'none'
  }
}

function hideButton() {
  if (ui) {
    ui.button.style.display = 'none'
    ui.attrib.style.display = 'none'
  }
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

    // Google/DeepL 사용 시 결과 인접 어트리뷰션 배지 (provider 요구사항)
    const badge = attributionBadge(settings.activeProvider, 'white')
    if (badge) {
      badge.style.cssText += 'margin-top:8px;opacity:.9;'
      tooltip.appendChild(badge)
    }
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
  // 트리거 버튼 어트리뷰션 판단용 provider 캐시 (변경 시 갱신)
  void getSettings().then((s) => (activeProvider = s.activeProvider))
  onSettingsChanged((s) => (activeProvider = s.activeProvider))

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
