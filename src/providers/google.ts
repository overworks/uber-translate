import type { TranslationProvider } from './types'

/** Google Cloud Translation — v2(API 키) / v3(프로젝트 ID + 액세스 토큰) 모두 지원 */
export const googleProvider: TranslationProvider = {
  id: 'google',
  async translate(req, settings) {
    const g = settings.google
    const source = req.source && req.source !== 'auto' ? req.source : undefined

    if (g.apiVersion === 'v3') {
      if (!g.projectId || !g.accessToken)
        throw new Error('Google v3에는 프로젝트 ID와 액세스 토큰이 필요합니다.')
      const url = `https://translation.googleapis.com/v3/projects/${encodeURIComponent(
        g.projectId,
      )}:translateText`
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${g.accessToken}`,
        },
        body: JSON.stringify({
          contents: req.text,
          targetLanguageCode: req.target,
          mimeType: 'text/plain',
          ...(source ? { sourceLanguageCode: source } : {}),
        }),
      })
      if (!r.ok) throw new Error(`Google v3 오류 (${r.status}): ${await r.text()}`)
      const data = await r.json()
      const list = data.translations ?? []
      return {
        translations: list.map((t: any) => t.translatedText),
        detectedSource: list[0]?.detectedLanguageCode,
      }
    }

    // v2
    if (!g.apiKey) throw new Error('Google v2에는 API 키가 필요합니다.')
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(
      g.apiKey,
    )}`
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: req.text,
        target: req.target,
        format: 'text',
        ...(source ? { source } : {}),
      }),
    })
    if (!r.ok) throw new Error(`Google v2 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json()
    const list = data.data?.translations ?? []
    return {
      translations: list.map((t: any) => t.translatedText),
      detectedSource: list[0]?.detectedSourceLanguage,
    }
  },
}
