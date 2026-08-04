import type { ProviderId } from '../lib/settings'
import type { TranslationProvider } from './types'
import { builtinProvider } from './builtin'
import { googleProvider } from './google'
import { deeplProvider } from './deepl'
import { libreTranslateProvider } from './libretranslate'
import { llmProvider } from './llm'

const registry: Record<ProviderId, TranslationProvider> = {
  builtin: builtinProvider,
  google: googleProvider,
  deepl: deeplProvider,
  libretranslate: libreTranslateProvider,
  llm: llmProvider,
}

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
