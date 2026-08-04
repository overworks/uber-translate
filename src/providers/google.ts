import type { TranslationProvider } from './types'

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2'

/**
 * languages.ts는 v3 표기(zh-Hans/zh-Hant)를 쓰지만 v2는 지역 코드를 요구한다.
 * 여기서만 변환하고 공통 목록은 건드리지 않는다 — 다른 provider는 현재 표기가 맞다.
 */
const LANG_MAP: Record<string, string> = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
}
const toV2Lang = (code: string) => LANG_MAP[code] ?? code

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

/**
 * v2는 format:'text'여도 응답을 HTML 이스케이프해 돌려준다(&#39; &amp; 등).
 * service worker에는 DOM 파서가 없으므로 직접 디코드한다.
 * 이중 이스케이프(&amp;#39; → &#39;)를 되살리지 않도록 반드시 한 번만 훑는다.
 */
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const cp = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1))
      // 유효 범위를 벗어나면 원문 유지 (fromCodePoint가 throw하는 것을 막는다)
      return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : whole
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole
  })
}

/** Google Cloud Translation v2 (API 키) */
export const googleProvider: TranslationProvider = {
  id: 'google',
  // 번역 대신 지원 언어 목록 조회로 키만 검증.
  async test(settings) {
    const { apiKey } = settings.google
    if (!apiKey) throw new Error('Google 번역에는 API 키가 필요합니다.')
    const r = await fetch(`${ENDPOINT}/languages?key=${encodeURIComponent(apiKey)}`)
    if (!r.ok) throw new Error(`Google 번역 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json().catch(() => null)
    const n = Array.isArray(data?.data?.languages) ? data.data.languages.length : undefined
    return n != null ? `언어 ${n}개 확인` : '키 확인'
  },
  async translate(req, settings) {
    const { apiKey } = settings.google
    if (!apiKey) throw new Error('Google 번역에는 API 키가 필요합니다.')

    const source = req.source && req.source !== 'auto' ? toV2Lang(req.source) : undefined
    const r = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: req.text,
        target: toV2Lang(req.target),
        format: 'text',
        ...(source ? { source } : {}),
      }),
    })
    if (!r.ok) throw new Error(`Google 번역 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json()
    const list = data.data?.translations ?? []
    return {
      translations: list.map((t: any) => decodeEntities(t.translatedText ?? '')),
      detectedSource: list[0]?.detectedSourceLanguage,
    }
  },
}
