import type { TranslationProvider } from './types'

/** LibreTranslate — 오픈소스 self-host/공개 인스턴스. baseUrl + (선택) api_key */
export const libreTranslateProvider: TranslationProvider = {
  id: 'libretranslate',
  async translate(req, settings) {
    const { baseUrl, apiKey } = settings.libretranslate
    if (!baseUrl) throw new Error('LibreTranslate 인스턴스 URL이 필요합니다.')
    const url = `${baseUrl.replace(/\/+$/, '')}/translate`

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: req.text,
        source: req.source && req.source !== 'auto' ? req.source : 'auto',
        target: req.target,
        format: 'text',
        ...(apiKey ? { api_key: apiKey } : {}),
      }),
    })
    if (!r.ok) throw new Error(`LibreTranslate 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json()

    // 입력이 배열이면 translatedText도 배열, 단일이면 문자열
    const translations: string[] = Array.isArray(data.translatedText)
      ? data.translatedText
      : [data.translatedText ?? '']
    // source=auto일 때만 detectedLanguage 반환 (배치는 배열, 단일은 객체)
    const detected = Array.isArray(data.detectedLanguage)
      ? data.detectedLanguage[0]
      : data.detectedLanguage
    return { translations, detectedSource: detected?.language }
  },
}
