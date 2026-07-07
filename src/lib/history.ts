import type { ProviderId } from './settings'

export interface HistoryEntry {
  /** 저장 시각 (epoch ms) — 정렬·표시용 */
  time: number
  source: string
  translated: string
  /** 요청한 출발 언어 ('auto' 포함) */
  sourceLang: string
  /** 실제 감지된 출발 언어 (있으면) */
  detectedSource?: string
  target: string
  provider: ProviderId
}

const KEY = 'history'
/** 보관할 최대 이력 개수 */
export const MAX_HISTORY = 20

export async function getHistory(): Promise<HistoryEntry[]> {
  const stored = (await chrome.storage.local.get(KEY))[KEY] as HistoryEntry[] | undefined
  return Array.isArray(stored) ? stored : []
}

/** 이력을 추가한다. 동일 (source, target, provider)는 최신으로 끌어올리고 최대 개수로 자른다. */
export async function addHistory(entry: HistoryEntry): Promise<void> {
  if (!entry.source.trim() || !entry.translated.trim()) return
  const list = await getHistory()
  const deduped = list.filter(
    (e) =>
      !(e.source === entry.source && e.target === entry.target && e.provider === entry.provider),
  )
  deduped.unshift(entry)
  await chrome.storage.local.set({ [KEY]: deduped.slice(0, MAX_HISTORY) })
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(KEY)
}
