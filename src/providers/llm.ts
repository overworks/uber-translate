import type { TranslationProvider } from './types'

/** ```json ... ``` 코드펜스나 앞뒤 텍스트에서 JSON 배열/객체만 추출 */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

/**
 * OpenAI-compatible 범용 번역 provider.
 * baseUrl/apiKey/model만 설정하면 OpenAI, OpenRouter, Groq, DeepSeek,
 * LM Studio, Ollama(/v1), vLLM 등 어떤 호환 엔드포인트든 사용 가능.
 */
export const llmProvider: TranslationProvider = {
  id: 'llm',
  async translate(req, settings) {
    const { baseUrl, apiKey, model } = settings.llm
    if (!baseUrl) throw new Error('LLM base URL이 필요합니다.')
    if (!model) throw new Error('LLM 모델명이 필요합니다.')

    const target = req.target
    const isBatch = req.text.length > 1
    const system =
      `You are a professional translation engine. Translate the user's content into ${target}. ` +
      `Output ONLY the translation — no explanations, no quotes, no commentary. Preserve inline whitespace.`
    const user = isBatch
      ? `Translate every string in this JSON array into ${target}. ` +
        `Return ONLY a JSON array of strings with the SAME length and SAME order, translations only:\n` +
        JSON.stringify(req.text)
      : req.text[0]

    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!r.ok) throw new Error(`LLM 오류 (${r.status}): ${await r.text()}`)
    const data = await r.json()
    const content: string = data.choices?.[0]?.message?.content ?? ''

    if (!isBatch) return { translations: [content.trim()] }

    let arr: unknown
    try {
      arr = JSON.parse(extractJson(content))
    } catch {
      arr = content.split('\n').map((s) => s.trim()).filter(Boolean)
    }
    if (!Array.isArray(arr) || arr.length !== req.text.length) {
      // 정렬이 깨지면 원문 보존이 안전하지만, 최소한 개별 재시도로 정확도를 확보한다.
      return {
        translations: await Promise.all(
          req.text.map(async (t) => {
            const one = await this.translate({ text: [t], source: req.source, target }, settings)
            return one.translations[0]
          }),
        ),
      }
    }
    return { translations: arr.map((v) => String(v)) }
  },
}
