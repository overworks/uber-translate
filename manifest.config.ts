import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Uber Translate',
  version: pkg.version,
  description: pkg.description,
  permissions: ['storage', 'activeTab', 'scripting', 'contextMenus'],
  host_permissions: [
    'https://translation.googleapis.com/*',
    'https://api-free.deepl.com/*',
    'https://api.deepl.com/*',
  ],
  // LLM base URL은 사용자가 자유롭게 입력하므로 optional로 두고 저장 시 런타임 요청한다.
  optional_host_permissions: ['https://*/*', 'http://localhost/*', 'http://127.0.0.1/*'],
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
  },
  options_page: 'src/options/index.html',
})
