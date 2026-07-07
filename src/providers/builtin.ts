import type { TranslationProvider } from './types'

// Chrome 내장 AI API는 아직 표준 lib.d.ts에 없으므로 런타임 전역을 any로 접근한다.
const win = self as any

async function detectSource(text: string): Promise<string> {
  try {
    if ('LanguageDetector' in win) {
      const detector = await win.LanguageDetector.create()
      const results = await detector.detect(text)
      detector.destroy?.()
      const top = results?.[0]?.detectedLanguage
      if (top && top !== 'und') return top
    }
  } catch {
    /* 감지 실패 시 영어로 폴백 */
  }
  return 'en'
}

/** Chrome 138+ 내장 Translator API. window 컨텍스트 + user activation 필요. */
export const builtinProvider: TranslationProvider = {
  id: 'builtin',
  runsInPage: true,
  async translate(req, _settings) {
    if (!('Translator' in win)) {
      throw new Error('이 브라우저는 내장 번역기를 지원하지 않습니다 (Chrome 138+ 데스크톱 필요).')
    }
    const source = req.source && req.source !== 'auto' ? req.source : await detectSource(req.text[0] ?? '')
    const target = req.target

    const availability = await win.Translator.availability({
      sourceLanguage: source,
      targetLanguage: target,
    })
    if (availability === 'unavailable') {
      throw new Error(`내장 번역기가 ${source} → ${target} 조합을 지원하지 않습니다.`)
    }

    const translator = await win.Translator.create({
      sourceLanguage: source,
      targetLanguage: target,
      monitor(m: any) {
        m.addEventListener('downloadprogress', (e: any) => {
          // 모델 다운로드 진행률 (0~1). 필요 시 UI로 전달 가능.
          console.debug('[uber-translate] 모델 다운로드', Math.round(e.loaded * 100) + '%')
        })
      },
    })

    const translations: string[] = []
    for (const t of req.text) translations.push(await translator.translate(t))
    translator.destroy?.()
    return { translations, detectedSource: source }
  },
}
