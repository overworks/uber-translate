import type { TranslationProvider } from './types'

/** DeepL — 키가 ':fx'로 끝나면 무료(api-free), 아니면 Pro(api.deepl.com) */
export const deeplProvider: TranslationProvider = {
  id: 'deepl',
  // 번역 대신 GET /v2/usage로 키만 검증 (문자 소모 없음).
  async test(settings) {
    const key = settings.deepl.apiKey
    if (!key) throw new Error('DeepL API 키가 필요합니다.')
    const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'
    const r = await fetch(`${host}/v2/usage`, {
      headers: { Authorization: `DeepL-Auth-Key ${key}` },
    })
    if (!r.ok) throw new Error(`DeepL 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json().catch(() => null)
    const used = data?.character_count
    const limit = data?.character_limit
    return used != null && limit != null
      ? `사용량 ${used.toLocaleString()}/${limit.toLocaleString()} 문자`
      : '키 확인'
  },
  async translate(req, settings) {
    const key = settings.deepl.apiKey
    if (!key) throw new Error('DeepL API 키가 필요합니다.')
    const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

    const params = new URLSearchParams()
    for (const t of req.text) params.append('text', t)
    params.append('target_lang', req.target.toUpperCase())
    if (req.source && req.source !== 'auto') params.append('source_lang', req.source.toUpperCase())

    const r = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
    if (!r.ok) throw new Error(`DeepL 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json()
    const list = data.translations ?? []
    return {
      translations: list.map((t: any) => t.text),
      detectedSource: list[0]?.detected_source_language,
    }
  },
}
