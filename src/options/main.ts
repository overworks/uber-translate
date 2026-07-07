import { getSettings, saveSettings, type ProviderId, type Settings } from '../lib/settings'
import { LANGUAGES, SOURCE_LANGUAGES } from '../lib/languages'
import { getGoogleToken } from '../lib/google-auth'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const provider = $<HTMLSelectElement>('provider')
const sourceLang = $<HTMLSelectElement>('sourceLang')
const targetLang = $<HTMLSelectElement>('targetLang')
const googleVersion = $<HTMLSelectElement>('google-version')
const googleAuthMode = $<HTMLSelectElement>('google-authMode')

function fillLangSelect(sel: HTMLSelectElement, list: { code: string; label: string }[]) {
  for (const l of list) {
    const opt = document.createElement('option')
    opt.value = l.code
    opt.textContent = `${l.label} (${l.code})`
    sel.appendChild(opt)
  }
}
fillLangSelect(sourceLang, SOURCE_LANGUAGES)
fillLangSelect(targetLang, LANGUAGES)

/** provider 선택에 따라 관련 설정 섹션만 표시 */
function updateVisibility() {
  const p = provider.value as ProviderId
  $('google-config').classList.toggle('hidden', p !== 'google')
  $('deepl-config').classList.toggle('hidden', p !== 'deepl')
  $('llm-config').classList.toggle('hidden', p !== 'llm')

  const v3 = googleVersion.value === 'v3'
  const oauth = googleAuthMode.value === 'oauth'
  $('google-v2-key').classList.toggle('hidden', v3)
  $('google-v3-project').classList.toggle('hidden', !v3)
  $('google-v3-authmode').classList.toggle('hidden', !v3)
  $('google-v3-connect').classList.toggle('hidden', !v3 || !oauth)
  $('google-v3-token').classList.toggle('hidden', !v3 || oauth)
}
provider.addEventListener('change', updateVisibility)
googleVersion.addEventListener('change', updateVisibility)
googleAuthMode.addEventListener('change', updateVisibility)

// "Google 계정 연결" — 대화형 동의 (이후 background에서 silent로 자동 갱신)
$<HTMLButtonElement>('google-connect').addEventListener('click', async () => {
  const status = $('google-connect-status')
  status.textContent = '연결 중…'
  try {
    await getGoogleToken(true)
    status.textContent = '연결됨 ✓'
  } catch (e) {
    status.textContent = e instanceof Error ? e.message : String(e)
  }
})

async function load() {
  const s = await getSettings()
  provider.value = s.activeProvider
  sourceLang.value = s.sourceLang
  targetLang.value = s.targetLang
  googleVersion.value = s.google.apiVersion
  googleAuthMode.value = s.google.authMode
  ;($('google-apiKey') as HTMLInputElement).value = s.google.apiKey
  ;($('google-projectId') as HTMLInputElement).value = s.google.projectId
  ;($('google-accessToken') as HTMLInputElement).value = s.google.accessToken
  ;($('deepl-apiKey') as HTMLInputElement).value = s.deepl.apiKey
  ;($('llm-baseUrl') as HTMLInputElement).value = s.llm.baseUrl
  ;($('llm-apiKey') as HTMLInputElement).value = s.llm.apiKey
  ;($('llm-model') as HTMLInputElement).value = s.llm.model
  updateVisibility()
}
void load()

/** LLM base URL 호스트에 대한 런타임 host 권한 요청 (optional_host_permissions) */
async function ensureLlmPermission(baseUrl: string): Promise<void> {
  try {
    const origin = new URL(baseUrl).origin + '/*'
    const has = await chrome.permissions.contains({ origins: [origin] })
    if (!has) await chrome.permissions.request({ origins: [origin] })
  } catch {
    /* URL 파싱 실패 등은 무시 — fetch 시점에 오류로 드러남 */
  }
}

$<HTMLButtonElement>('save').addEventListener('click', async () => {
  const s = await getSettings()
  const next: Settings = {
    ...s,
    activeProvider: provider.value as ProviderId,
    sourceLang: sourceLang.value,
    targetLang: targetLang.value,
    google: {
      apiVersion: googleVersion.value as 'v2' | 'v3',
      apiKey: ($('google-apiKey') as HTMLInputElement).value.trim(),
      projectId: ($('google-projectId') as HTMLInputElement).value.trim(),
      authMode: googleAuthMode.value as 'oauth' | 'token',
      accessToken: ($('google-accessToken') as HTMLInputElement).value.trim(),
    },
    deepl: { apiKey: ($('deepl-apiKey') as HTMLInputElement).value.trim() },
    llm: {
      baseUrl: ($('llm-baseUrl') as HTMLInputElement).value.trim(),
      apiKey: ($('llm-apiKey') as HTMLInputElement).value.trim(),
      model: ($('llm-model') as HTMLInputElement).value.trim(),
    },
  }

  if (next.activeProvider === 'llm' && next.llm.baseUrl) {
    await ensureLlmPermission(next.llm.baseUrl)
  }

  await saveSettings(next)
  const status = $('status')
  status.textContent = '저장되었습니다 ✓'
  setTimeout(() => (status.textContent = ''), 2000)
})
