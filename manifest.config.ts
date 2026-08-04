import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

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
  ],
  // Google(v2 API 키)/DeepL은 고정 엔드포인트라 정적으로 선언한다.
  host_permissions: [
    'https://translation.googleapis.com/*',
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
