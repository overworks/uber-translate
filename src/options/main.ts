import { getSettings, saveSettings, type ProviderId, type Settings } from '../lib/settings'
import { LANGUAGES, SOURCE_LANGUAGES } from '../lib/languages'
import { getGoogleToken } from '../lib/google-auth'
import { translate } from '../lib/translate-client'
import { getProvider, PROVIDER_LABELS } from '../providers'
import { googleBadge, deeplBadge, GOOGLE_DISCLAIMER } from '../lib/attribution'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const provider = $<HTMLSelectElement>('provider')
const sourceLang = $<HTMLSelectElement>('sourceLang')
const targetLang = $<HTMLSelectElement>('targetLang')
const googleVersion = $<HTMLSelectElement>('google-version')
const googleAuthMode = $<HTMLSelectElement>('google-authMode')

// 어트리뷰션: 공식 배지 + (Google) 보증 부인 문구(원문) 주입
$('google-badge').appendChild(googleBadge('color'))
$('google-disclaimer').textContent = GOOGLE_DISCLAIMER
$('deepl-badge').appendChild(deeplBadge('color'))

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
  $('google-legal').classList.toggle('hidden', p !== 'google')
  $('deepl-legal').classList.toggle('hidden', p !== 'deepl')
  $('deepl-config').classList.toggle('hidden', p !== 'deepl')
  $('libretranslate-config').classList.toggle('hidden', p !== 'libretranslate')
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
  ;($('libretranslate-baseUrl') as HTMLInputElement).value = s.libretranslate.baseUrl
  ;($('libretranslate-apiKey') as HTMLInputElement).value = s.libretranslate.apiKey
  ;($('llm-baseUrl') as HTMLInputElement).value = s.llm.baseUrl
  ;($('llm-apiKey') as HTMLInputElement).value = s.llm.apiKey
  ;($('llm-model') as HTMLInputElement).value = s.llm.model
  ;($('llm-prompt') as HTMLTextAreaElement).value = s.llm.prompt
  updateVisibility()
}
void load()

/** 사용자 입력 URL 호스트에 대한 런타임 host 권한 요청 (optional_host_permissions) */
async function ensureHostPermission(baseUrl: string): Promise<void> {
  try {
    const origin = new URL(baseUrl).origin + '/*'
    const has = await chrome.permissions.contains({ origins: [origin] })
    if (!has) await chrome.permissions.request({ origins: [origin] })
  } catch {
    /* URL 파싱 실패 등은 무시 — fetch 시점에 오류로 드러남 */
  }
}

/** 현재 폼 값을 Settings로 수집 */
async function collectSettings(): Promise<Settings> {
  const s = await getSettings()
  return {
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
    libretranslate: {
      baseUrl: ($('libretranslate-baseUrl') as HTMLInputElement).value.trim(),
      apiKey: ($('libretranslate-apiKey') as HTMLInputElement).value.trim(),
    },
    llm: {
      baseUrl: ($('llm-baseUrl') as HTMLInputElement).value.trim(),
      apiKey: ($('llm-apiKey') as HTMLInputElement).value.trim(),
      model: ($('llm-model') as HTMLInputElement).value.trim(),
      prompt: ($('llm-prompt') as HTMLTextAreaElement).value.trim(),
    },
  }
}

/** 저장 + (LLM/LibreTranslate) 런타임 host 권한 확보 */
async function persist(next: Settings): Promise<void> {
  if (next.activeProvider === 'llm' && next.llm.baseUrl) {
    await ensureHostPermission(next.llm.baseUrl)
  }
  if (next.activeProvider === 'libretranslate' && next.libretranslate.baseUrl) {
    await ensureHostPermission(next.libretranslate.baseUrl)
  }
  await saveSettings(next)
}

$<HTMLButtonElement>('save').addEventListener('click', async () => {
  await persist(await collectSettings())
  const status = $('status')
  status.textContent = '저장되었습니다 ✓'
  setTimeout(() => (status.textContent = ''), 2000)
})

// 대상 언어가 영어면 한국어 샘플, 아니면 영어 샘플 (같은 언어쌍 회피)로 실제 번역
async function sampleTranslate(next: Settings): Promise<string> {
  const toEnglish = next.targetLang.toLowerCase().startsWith('en')
  const req = toEnglish
    ? { text: ['안녕하세요'], source: 'ko', target: next.targetLang }
    : { text: ['Hello'], source: 'en', target: next.targetLang }
  const res = await translate(req, next)
  const translated = res.translations[0] ?? ''
  if (!translated) throw new Error('빈 응답을 받았습니다.')
  return `"${translated}"`
}

/**
 * 테스트 실행 — 현재 설정을 저장한 뒤 검증한다.
 * - connection: provider의 경량 test()(예: LLM은 GET /models)로 실제 번역 없이 설정만 확인.
 *   test()가 없는 provider는 자동으로 샘플 번역으로 폴백.
 * - translate: 언제나 샘플 문장을 실제로 번역해 결과를 보여줌.
 */
async function runTest(mode: 'connection' | 'translate') {
  const out = $('test-status')
  out.className = ''
  out.textContent = '테스트 중…'
  try {
    const next = await collectSettings()
    await persist(next) // background/직접 fetch가 동일 설정·권한을 쓰도록 먼저 저장
    const label = PROVIDER_LABELS[next.activeProvider]
    const provider = getProvider(next.activeProvider)

    // 옵션 페이지는 host 권한이 있으면 CORS 없이 직접 fetch 가능.
    const detail =
      mode === 'connection' && provider.test
        ? await provider.test(next)
        : await sampleTranslate(next)

    out.className = 'ok'
    out.textContent = `${mode === 'translate' ? '번역 성공' : '연결 성공'} ✓ (${label}: ${detail})`
  } catch (e) {
    out.className = 'err'
    out.textContent = `${mode === 'translate' ? '번역 실패' : '연결 실패'}: ${
      e instanceof Error ? e.message : String(e)
    }`
  }
}

$<HTMLButtonElement>('test').addEventListener('click', () => void runTest('connection'))
$<HTMLButtonElement>('test-translate').addEventListener('click', () => void runTest('translate'))
