# Uber Translate — 개인정보 처리방침 / Privacy Policy

_최종 수정: 2026-07-08 · Last updated: 2026-07-08_

---

## 한국어

Uber Translate("본 확장")는 사용자가 직접 선택한 번역 서비스로 텍스트를 번역해 주는 Chrome 확장 프로그램입니다. 본 확장은 **자체 서버를 운영하지 않으며**, 사용자의 데이터를 수집·저장·판매·공유하지 않습니다.

### 1. 로컬에만 저장되는 정보

다음 정보는 사용자의 브라우저 안(`chrome.storage.local`)에만 저장되며, 개발자를 포함한 어떤 외부로도 전송되지 않습니다.

- **번역 서비스 설정** — 사용자가 입력한 API 키, 엔드포인트 URL, 모델명, 프롬프트 등
- **번역 이력** — 최근 번역한 원문/번역문 최대 20건 (사용자가 설정에서 언제든 삭제 가능)
- **환경 설정** — 활성 번역 서비스, 출발/대상 언어

API 키를 포함한 위 정보는 확장을 삭제하면 함께 제거됩니다.

### 2. 번역을 위한 데이터 전송

번역을 실행하면, 번역할 텍스트가 **사용자가 선택한 번역 서비스로만** 전송됩니다. 본 확장은 여러 서비스 중 하나를 사용자가 고르는 구조이며, 선택하지 않은 서비스로는 어떤 데이터도 전송되지 않습니다.

| 선택한 서비스 | 텍스트 전송 대상 |
|---|---|
| Chrome 내장 번역기 | 기기 내(온디바이스) 처리 — 외부 전송 없음 |
| DeepL | `api.deepl.com` / `api-free.deepl.com` |
| LibreTranslate | 사용자가 입력한 인스턴스 URL |
| LLM (OpenAI 호환) | 사용자가 입력한 엔드포인트 URL (OpenAI, OpenRouter, 로컬 서버 등) |
| Google 번역 _(해당 버전에 한함)_ | `translation.googleapis.com` |

전송된 텍스트에 대한 각 서비스의 처리 방침은 해당 서비스의 개인정보 처리방침을 따릅니다. 본 확장은 이 전송을 중개할 뿐 별도로 저장하지 않습니다.

### 3. 권한 사용 이유

- **storage** — 위 설정·이력을 로컬에 저장
- **activeTab / scripting** — 현재 페이지의 선택 텍스트 또는 전체 페이지 번역
- **contextMenus** — 우클릭 메뉴로 번역 실행
- **호스트 권한(선택적 포함)** — 사용자가 직접 지정한 번역 API 엔드포인트로 요청을 보내기 위해, 저장 시점에 해당 호스트 권한을 런타임으로 요청

### 4. 수집하지 않는 것

- 분석/추적(analytics) 도구를 사용하지 않습니다.
- 광고를 게재하지 않습니다.
- 원격 코드를 내려받아 실행하지 않습니다.
- 개인정보를 제3자에게 판매·양도하지 않습니다.

---

## English

Uber Translate ("the Extension") is a Chrome extension that translates text using a translation service **chosen by the user**. The Extension operates **no servers of its own** and does not collect, store, sell, or share user data.

### 1. Information stored locally only

The following is stored solely within the user's browser (`chrome.storage.local`) and is never transmitted anywhere, including to the developer:

- **Service settings** — API keys, endpoint URLs, model names, and prompts entered by the user
- **Translation history** — up to 20 recent source/translated text pairs (clearable anytime from settings)
- **Preferences** — active service, source/target languages

Uninstalling the Extension removes all of the above, including API keys.

### 2. Data sent for translation

When you translate, the text is sent **only to the translation service you selected**. No data is sent to any service you did not choose.

| Selected service | Text is sent to |
|---|---|
| Chrome built-in translator | On-device — no external transmission |
| DeepL | `api.deepl.com` / `api-free.deepl.com` |
| LibreTranslate | The instance URL you entered |
| LLM (OpenAI-compatible) | The endpoint URL you entered |
| Google Translate _(versions that include it)_ | `translation.googleapis.com` |

Text sent to a service is governed by that service's own privacy policy. The Extension merely relays the request and does not separately retain it.

### 3. Permissions

- **storage** — persist the settings/history above locally
- **activeTab / scripting** — translate selected text or the full current page
- **contextMenus** — trigger translation from the right-click menu
- **host permissions (optional)** — requested at runtime, when you save settings, so requests can reach the translation endpoint you specified

### 4. What we do not do

No analytics or tracking; no ads; no remote code execution; no sale or transfer of personal data to third parties.
