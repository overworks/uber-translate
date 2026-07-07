# Uber Translate

번역 서비스를 **직접 골라 쓰는** Chrome 확장 프로그램 (Manifest V3).

## 지원 번역 서비스

- **Chrome 내장 번역기** — API 키 불필요, 온디바이스 (Chrome 138+ 데스크톱)
- **Google 번역** — Cloud Translation v2(API 키) / v3(프로젝트 ID + 액세스 토큰)
- **DeepL** — 무료(`:fx`)/Pro 자동 판별
- **LibreTranslate** — 오픈소스 self-host/공개 인스턴스 (인스턴스 URL + 선택 API 키)
- **LLM (OpenAI 호환)** — `baseUrl`/`apiKey`/`model`만 넣으면 OpenAI, OpenRouter,
  Groq, DeepSeek, LM Studio, Ollama(`/v1`), vLLM 등 어떤 호환 엔드포인트든 사용

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

## Google 번역 v3 인증 (chrome.identity OAuth)

v3의 액세스 토큰은 약 1시간이면 만료됩니다. `chrome.identity`를 쓰면 Chrome이
토큰을 자동 발급·갱신하므로 매번 붙여넣을 필요가 없습니다. **한 번만** 설정하면 됩니다:

1. 확장을 로드하고(`chrome://extensions`) 발급된 **확장 ID**를 확인합니다.
2. GCP 콘솔 → **API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID 만들기**
   → 유형 **Chrome 확장 프로그램**, 위 확장 ID 입력.
3. 발급된 `client_id`를 `manifest.config.ts`의 `oauth2.client_id`에 넣고 다시 `build` → 리로드.
4. 대상 프로젝트에 **Cloud Translation API 활성화** + 결제 계정 연결.
5. 확장 **설정**에서 Google → v3 → 인증 방식 **"Chrome 계정 연결"** → **Google 계정 연결** 버튼 클릭.

이후로는 토큰이 만료돼도 자동 갱신되며, 401 발생 시 확장이 캐시를 비우고 재발급합니다.
간단하게 쓰려면 v3 대신 **v2(API 키)** 를 쓰면 만료·OAuth 설정이 전혀 없습니다.

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
