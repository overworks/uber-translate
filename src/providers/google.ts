import type { TranslationProvider } from './types'
import { getGoogleToken, clearGoogleToken } from '../lib/google-auth'

/** Google Cloud Translation — v2(API 키) / v3(프로젝트 ID + 액세스 토큰) 모두 지원 */
export const googleProvider: TranslationProvider = {
  id: 'google',
  async translate(req, settings) {
    const g = settings.google
    const source = req.source && req.source !== 'auto' ? req.source : undefined

    if (g.apiVersion === 'v3') {
      if (!g.projectId) throw new Error('Google v3에는 프로젝트 ID가 필요합니다.')
      const url = `https://translation.googleapis.com/v3/projects/${encodeURIComponent(
        g.projectId,
      )}:translateText`
      const body = JSON.stringify({
        contents: req.text,
        targetLanguageCode: req.target,
        mimeType: 'text/plain',
        ...(source ? { sourceLanguageCode: source } : {}),
      })
      const useOauth = g.authMode === 'oauth'

      const send = (token: string) =>
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            // 사용자 자격증명 토큰은 quota project가 없으면 거부되므로 명시한다.
            'x-goog-user-project': g.projectId,
          },
          body,
        })

      let token = useOauth ? await getGoogleToken(false) : g.accessToken
      if (!token) throw new Error('Google v3에는 액세스 토큰이 필요합니다.')
      let r = await send(token)

      // OAuth 모드: 토큰 만료(401) 시 캐시 비우고 한 번 재발급 후 재시도
      if (r.status === 401 && useOauth) {
        await clearGoogleToken(token)
        token = await getGoogleToken(false)
        r = await send(token)
      }

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
