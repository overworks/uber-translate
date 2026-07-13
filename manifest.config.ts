import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

// INCLUDE_GOOGLE=0 이면 Google 번역(OAuth/identity/googleapis)을 제외한 "심사용 빌드".
// OAuth client_id가 확정되기 전 스토어 심사를 먼저 통과시키기 위한 것이다.
const includeGoogle = process.env.INCLUDE_GOOGLE !== '0'

export default defineManifest({
  manifest_version: 3,
  name: 'Uber Translate',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'src/icons/icon-16.png',
    32: 'src/icons/icon-32.png',
    48: 'src/icons/icon-48.png',
    128: 'src/icons/icon-128.png',
  },
  permissions: [
    'storage',
    'contextMenus',
    // activeTab/scripting은 선언만 하고 실제 chrome.scripting/activeTab API를 쓰지 않아
    // 스토어 심사에서 거부됨. 페이지 접근은 아래 content_scripts(<all_urls>)가 담당한다.
    // identity는 Google v3 OAuth 전용
    ...(includeGoogle ? ['identity' as const] : []),
  ],
  // Google 번역 v3용 OAuth. GCP 콘솔에서 "Chrome 확장" 유형 OAuth 클라이언트를
  // 이 확장 ID로 등록한 뒤 client_id를 아래에 넣으세요. (README 참고)
  ...(includeGoogle
    ? {
        oauth2: {
          client_id: 'YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com',
          scopes: ['https://www.googleapis.com/auth/cloud-translation'],
        },
      }
    : {}),
  host_permissions: [
    ...(includeGoogle ? ['https://translation.googleapis.com/*'] : []),
    'https://api-free.deepl.com/*',
    'https://api.deepl.com/*',
  ],
  // LLM/LibreTranslate base URL은 사용자가 자유롭게 입력하므로(평문 HTTP self-host 포함)
  // optional로 두고 저장 시 런타임 요청한다.
  optional_host_permissions: ['https://*/*', 'http://*/*'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      js: ['src/content/index.ts'],
      matches: ['<all_urls>'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Uber Translate',
    default_icon: {
      16: 'src/icons/icon-16.png',
      32: 'src/icons/icon-32.png',
      48: 'src/icons/icon-48.png',
      128: 'src/icons/icon-128.png',
    },
  },
  options_page: 'src/options/index.html',
})
