import type { Settings } from '../lib/settings'

export interface TranslateRequest {
  /** 번역할 텍스트 배열 (배치). 단일 번역도 길이 1 배열로 전달 */
  text: string[]
  /** 출발 언어. undefined 또는 'auto' = 자동 감지 */
  source?: string
  /** 대상 언어 (BCP-47) */
  target: string
}

export interface TranslateResult {
  /** 입력과 같은 순서/길이의 번역 결과 */
  translations: string[]
  /** 감지된 출발 언어 (제공 시) */
  detectedSource?: string
}

export interface TranslationProvider {
  id: Settings['activeProvider']
  /**
   * true면 window 컨텍스트(content/popup)에서 직접 실행해야 한다.
   * Chrome 내장 Translator는 service worker에서 사용 불가하므로 true.
   */
  runsInPage?: boolean
  translate(req: TranslateRequest, settings: Settings): Promise<TranslateResult>
  /**
   * (선택) 실제 번역 없이 설정을 가볍게 검증한다.
   * 성공 시 짧은 설명(예: "모델 12개 확인")을 반환하고, 실패 시 throw.
   * 정의하지 않으면 연결 테스트는 샘플 문장 번역으로 대체된다.
   */
  test?(settings: Settings): Promise<string>
}
