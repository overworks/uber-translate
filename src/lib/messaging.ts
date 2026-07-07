import type { TranslateRequest, TranslateResult } from '../providers/types'

/** popup/content → background: 번역 요청 (네트워크 provider 위임) */
export interface TranslateMessage {
  type: 'translate'
  req: TranslateRequest
}
export interface TranslateResponse {
  result?: TranslateResult
  error?: string
}

/** popup → content: 페이지 제어 */
export type PageMessage =
  | { type: 'page:translate' }
  | { type: 'page:restore' }
  | { type: 'selection:translate' }

export interface PageResponse {
  ok?: boolean
  error?: string
}
