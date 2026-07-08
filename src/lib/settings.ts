export type ProviderId = 'builtin' | 'google' | 'deepl' | 'libretranslate' | 'llm'

export interface GoogleConfig {
  apiVersion: 'v2' | 'v3'
  /** v2: API 키 */
  apiKey: string
  /** v3: GCP 프로젝트 ID (URL + quota project) */
  projectId: string
  /** v3 인증 방식: 'oauth' = chrome.identity 자동 갱신, 'token' = 수동 액세스 토큰 */
  authMode: 'oauth' | 'token'
  /** v3(token 모드): 수동 붙여넣은 OAuth 2.0 액세스 토큰 */
  accessToken: string
}

export interface DeeplConfig {
  apiKey: string
}

/** LibreTranslate — self-host/공개 인스턴스마다 URL·키가 다르므로 사용자 입력 */
export interface LibreTranslateConfig {
  /** 인스턴스 URL (예: http://localhost:5000, https://libretranslate.com) */
  baseUrl: string
  /** 인스턴스가 요구할 때만 필요 (공개 인스턴스 등) */
  apiKey: string
}

/** OpenAI-compatible 범용 설정 (OpenAI, OpenRouter, Groq, LM Studio, Ollama 등) */
export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  /** (선택) system 프롬프트. 비어있으면 기본 프롬프트 사용. {{target}}/{{source}} 치환 지원 */
  prompt: string
}

export interface Settings {
  activeProvider: ProviderId
  /** 대상 언어 (BCP-47) */
  targetLang: string
  /** 출발 언어. 'auto' = 자동 감지 */
  sourceLang: string
  google: GoogleConfig
  deepl: DeeplConfig
  libretranslate: LibreTranslateConfig
  llm: LlmConfig
}

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'builtin',
  targetLang: 'ko',
  sourceLang: 'auto',
  google: { apiVersion: 'v2', apiKey: '', projectId: '', authMode: 'oauth', accessToken: '' },
  deepl: { apiKey: '' },
  libretranslate: { baseUrl: '', apiKey: '' },
  llm: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini', prompt: '' },
}

const KEY = 'settings'

/** 저장된 설정을 기본값과 깊게 병합해 반환한다. */
export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined
  if (!stored) return structuredClone(DEFAULT_SETTINGS)
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    google: { ...DEFAULT_SETTINGS.google, ...stored.google },
    deepl: { ...DEFAULT_SETTINGS.deepl, ...stored.deepl },
    libretranslate: { ...DEFAULT_SETTINGS.libretranslate, ...stored.libretranslate },
    llm: { ...DEFAULT_SETTINGS.llm, ...stored.llm },
  }
  // 마이그레이션: authMode 도입 이전에 저장된 v3 사용자는 조용히 OAuth로 바뀌면 안 되므로
  // 액세스 토큰이 있으면 'token' 모드로 유지한다.
  if (stored.google && stored.google.authMode === undefined) {
    merged.google.authMode = stored.google.accessToken ? 'token' : 'oauth'
  }
  return merged
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings })
}

export function onSettingsChanged(cb: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) cb(changes[KEY].newValue as Settings)
  })
}
