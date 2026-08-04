export type ProviderId = 'builtin' | 'google' | 'deepl' | 'libretranslate' | 'llm'

/** Google Cloud Translation v2 — API 키 하나로 동작 */
export interface GoogleConfig {
  apiKey: string
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
  google: { apiKey: '' },
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
    // google은 스프레드가 아닌 명시적 픽 — v3 시절의 accessToken(만료된 OAuth 토큰)
    // 등 폐기된 키가 저장소에 남아 다시 기록되지 않도록 한다.
    google: { apiKey: stored.google?.apiKey ?? DEFAULT_SETTINGS.google.apiKey },
    deepl: { ...DEFAULT_SETTINGS.deepl, ...stored.deepl },
    libretranslate: { ...DEFAULT_SETTINGS.libretranslate, ...stored.libretranslate },
    llm: { ...DEFAULT_SETTINGS.llm, ...stored.llm },
  }
  // 저장된 activeProvider가 알 수 없는 값이면 기본값으로 되돌린다. 이렇게 하지 않으면
  // getProvider가 throw하거나 옵션 셀렉트가 빈 값이 되어 무효한 provider 상태가 저장될 수 있다.
  if (!isAvailableProvider(merged.activeProvider)) {
    merged.activeProvider = DEFAULT_SETTINGS.activeProvider
  }
  return merged
}

/** 선택 가능한 provider인지 검사한다. */
function isAvailableProvider(id: unknown): id is ProviderId {
  const available: ProviderId[] = ['builtin', 'google', 'deepl', 'libretranslate', 'llm']
  return typeof id === 'string' && (available as string[]).includes(id)
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: settings })
}

export function onSettingsChanged(cb: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[KEY]) cb(changes[KEY].newValue as Settings)
  })
}
