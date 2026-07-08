import type { ProviderId } from '../lib/settings'
import type { TranslationProvider } from './types'
import { builtinProvider } from './builtin'
import { googleProvider } from './google'
import { deeplProvider } from './deepl'
import { libreTranslateProvider } from './libretranslate'
import { llmProvider } from './llm'

const registry: Partial<Record<ProviderId, TranslationProvider>> = {
  builtin: builtinProvider,
  deepl: deeplProvider,
  libretranslate: libreTranslateProvider,
  llm: llmProvider,
}
// 심사용 빌드(__INCLUDE_GOOGLE__=false)에서는 googleProvider 참조가 죽은 가지가 되어
// google.ts → google-auth.ts(chrome.identity) 체인이 번들에서 트리셰이킹으로 제거된다.
if (__INCLUDE_GOOGLE__) registry.google = googleProvider

export function getProvider(id: ProviderId): TranslationProvider {
  const p = registry[id]
  if (!p) throw new Error(`알 수 없는 번역 provider: ${id}`)
  return p
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  builtin: 'Chrome 내장 번역기',
  google: 'Google 번역',
  deepl: 'DeepL',
  libretranslate: 'LibreTranslate',
  llm: 'LLM (OpenAI 호환)',
}
