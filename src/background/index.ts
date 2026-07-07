import { getProvider } from '../providers'
import { getSettings } from '../lib/settings'
import type { TranslateMessage, TranslateResponse } from '../lib/messaging'

// 네트워크 provider 번역 요청 처리 (Google / DeepL / LLM)
chrome.runtime.onMessage.addListener((msg: TranslateMessage, _sender, sendResponse) => {
  if (msg?.type !== 'translate') return
  ;(async () => {
    try {
      const settings = await getSettings()
      const provider = getProvider(settings.activeProvider)
      const result = await provider.translate(msg.req, settings)
      sendResponse({ result } satisfies TranslateResponse)
    } catch (e) {
      sendResponse({ error: e instanceof Error ? e.message : String(e) } satisfies TranslateResponse)
    }
  })()
  return true // 비동기 응답
})

// 우클릭 컨텍스트 메뉴: 선택 텍스트 번역
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'uber-translate-selection',
    title: '선택 텍스트 번역',
    contexts: ['selection'],
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'uber-translate-selection' && tab?.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'selection:translate' }).catch(() => {})
  }
})
