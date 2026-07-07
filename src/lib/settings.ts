export type ProviderId = 'builtin' | 'google' | 'deepl' | 'llm'

export interface GoogleConfig {
  apiVersion: 'v2' | 'v3'
  /** v2: API 키 */
  apiKey: string
  /** v3: GCP 프로젝트 ID */
  projectId: string
  /** v3: OAuth 2.0 액세스 토큰 */
  accessToken: string
}

export interface DeeplConfig {
  apiKey: string
}

/** OpenAI-compatible 범용 설정 (OpenAI, OpenRouter, Groq, LM Studio, Ollama 등) */
export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export interface Settings {
  activeProvider: ProviderId
  /** 대상 언어 (BCP-47) */
  targetLang: string
  /** 출발 언어. 'auto' = 자동 감지 */
  sourceLang: string
  google: GoogleConfig
  deepl: DeeplConfig
  llm: LlmConfig
}

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'builtin',
  targetLang: 'ko',
  sourceLang: 'auto',
  google: { apiVersion: 'v2', apiKey: '', projectId: '', accessToken: '' },
  deepl: { apiKey: '' },
  llm: { baseUrl: 'https://api.openai.com/v1', apiKey: '', model: 'gpt-4o-mini' },
}

const KEY = 'settings'

/** 저장된 설정을 기본값과 깊게 병합해 반환한다. */
export async function getSettings(): Promise<Settings> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as Partial<Settings> | undefined
  if (!stored) return structuredClone(DEFAULT_SETTINGS)
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    google: { ...DEFAULT_SETTINGS.google, ...stored.google },
    deepl: { ...DEFAULT_SETTINGS.deepl, ...stored.deepl },
    llm: { ...DEFAULT_SETTINGS.llm, ...stored.llm },
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings })
}

export function onSettingsChanged(cb: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) cb(changes[KEY].newValue as Settings)
  })
}
