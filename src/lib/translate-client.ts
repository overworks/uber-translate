import { getProvider } from '../providers'
import type { TranslateRequest, TranslateResult } from '../providers/types'
import type { TranslateResponse } from './messaging'
import { getSettings, type Settings } from './settings'

/**
 * content script / popup 에서 호출하는 통합 번역 함수.
 * - 내장 Translator(runsInPage) → 현재 window 컨텍스트에서 직접 실행
 * - 그 외 네트워크 provider → background service worker로 위임 (CORS 회피)
 */
export async function translate(
  req: TranslateRequest,
  settings?: Settings,
): Promise<TranslateResult> {
  const s = settings ?? (await getSettings())
  const provider = getProvider(s.activeProvider)

  if (provider.runsInPage) {
    return provider.translate(req, s)
  }

  const res = (await chrome.runtime.sendMessage({ type: 'translate', req })) as TranslateResponse
  if (!res) throw new Error('background로부터 응답이 없습니다.')
  if (res.error) throw new Error(res.error)
  if (!res.result) throw new Error('번역 결과가 비어 있습니다.')
  return res.result
}
