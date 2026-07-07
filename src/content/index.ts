import { initSelection, translateCurrentSelection } from './selection'
import { translatePage, restorePage } from './fullpage'
import type { PageMessage, PageResponse } from '../lib/messaging'

initSelection()

chrome.runtime.onMessage.addListener((msg: PageMessage, _sender, sendResponse) => {
  switch (msg?.type) {
    case 'page:translate':
      translatePage()
        .then(() => sendResponse({ ok: true } satisfies PageResponse))
        .catch((e) => sendResponse({ error: String(e?.message ?? e) } satisfies PageResponse))
      return true // 비동기
    case 'page:restore':
      restorePage()
      sendResponse({ ok: true } satisfies PageResponse)
      return
    case 'selection:translate':
      translateCurrentSelection()
      sendResponse({ ok: true } satisfies PageResponse)
      return
  }
})
