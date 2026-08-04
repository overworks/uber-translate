# Uber Translate

번역 서비스를 **직접 골라 쓰는** Chrome 확장 프로그램 (Manifest V3).

## 지원 번역 서비스

- **Chrome 내장 번역기** — API 키 불필요, 온디바이스 (Chrome 138+ 데스크톱)
- **Google 번역** — Cloud Translation v2 (API 키)
- **DeepL** — 무료(`:fx`)/Pro 자동 판별
- **LibreTranslate** — 오픈소스 self-host/공개 인스턴스 (인스턴스 URL + 선택 API 키)
- **LLM (OpenAI 호환)** — `baseUrl`/`apiKey`/`model`만 넣으면 OpenAI, OpenRouter,
  Groq, DeepSeek, LM Studio, Ollama(`/v1`), vLLM 등 어떤 호환 엔드포인트든 사용.
  설정에서 system 프롬프트를 직접 지정할 수 있고(비우면 기본값), `{{target}}`·`{{source}}`가
  번역 시 대상/출발 언어 코드로 치환됩니다.
  - **Ollama 로컬 사용 시 주의**: Ollama는 기본적으로 `127.0.0.1`/`0.0.0.0` 외의 origin을
    차단하므로, 확장에서 호출하면 **403**이 납니다. `OLLAMA_ORIGINS=chrome-extension://*`로
    Ollama를 실행(또는 systemd `Environment=`에 추가 후 재시작)하면 해결됩니다.

## 번역 방식

- **선택 텍스트 번역** — 드래그하면 뜨는 버튼(또는 우클릭 메뉴)으로 툴팁 번역
- **전체 페이지 번역** — 팝업의 "이 페이지 번역" → 인라인 치환, "원문 복원"으로 되돌리기
- **팝업 미니 번역기** — 텍스트 직접 입력 번역

## 개발 / 실행

```bash
npm install
npm run dev      # 개발 (HMR) — dist/ 생성
# 또는
npm run build    # 프로덕션 빌드
```

1. Chrome에서 `chrome://extensions` 열기 → **개발자 모드** 켜기
2. **압축해제된 확장 프로그램 로드** → `dist/` 폴더 선택
3. 확장 아이콘 → **설정**에서 번역 서비스와 API 키 구성

## Google 번역 설정

Cloud Translation **v2**(API 키)만 사용합니다. 만료되는 토큰도, OAuth 설정도 없습니다.

1. GCP 콘솔에서 대상 프로젝트에 **Cloud Translation API 활성화** + 결제 계정 연결.
2. **API 및 서비스 → 사용자 인증 정보 → API 키 만들기**로 키를 발급
   (키 제한은 **Cloud Translation API**로 걸어두는 것을 권장).
3. 확장 **설정** → 활성 서비스 **Google 번역** → 발급한 API 키 입력 → 저장.

## 번역 서비스 어트리뷰션

일부 provider는 번역물 노출 시 출처 표기를 요구합니다. 해당 provider가 **활성일
때만** 번역 결과·트리거 옆에 조건부로 배지를 표시하며(팝업·선택 툴팁·전체 페이지·
설정 페이지), 다른 provider에서는 표시하지 않습니다. 관련 코드는
`src/lib/attribution.ts` 한 곳에 모여 있습니다.

- **Google (Cloud Translation)** — [어트리뷰션 요건](https://cloud.google.com/translate/attribution)에
  따라 공식 **"powered by Google Translate"** 배지(→ `translate.google.com`)와
  보증 부인 문구를 표시. 배지는 Google 공식 에셋 무수정 사용.
- **DeepL** — [Pro License §8.3.3](https://www.deepl.com/en/pro-license)에 따라
  수정 없이 노출되는 번역물에 **브랜드명(도메인 포함)** 을 표기. 공식 워드마크로
  "powered by DeepL" 배지(→ `deepl.com`)를 Google과 동일한 형식으로 표시.
- **LLM(OpenAI 호환)·LibreTranslate·Chrome 내장** — 소비자 측 어트리뷰션 의무가
  없어 별도 표기하지 않습니다.

## 아키텍처

- 네트워크 provider(Google/DeepL/LLM)는 **background service worker**에서 실행해 CORS 회피
- Chrome 내장 Translator는 window 컨텍스트가 필요하므로 **content script/popup**에서 직접 실행
- 새 번역 서비스 추가는 `src/providers/`에 `TranslationProvider` 구현 파일 하나 추가 → `index.ts` 등록

## 구조

```
src/
  background/   # 메시지 라우터 → 네트워크 provider
  content/      # 선택 번역 · 전체 페이지 번역
  providers/    # google · deepl · llm · builtin (+ 레지스트리)
  popup/        # 미니 번역기 + 페이지 제어
  options/      # provider 선택 · 키 · 언어 설정
  lib/          # settings · languages · messaging · translate-client
```
