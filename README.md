# Uber Translate

번역 서비스를 **직접 골라 쓰는** Chrome 확장 프로그램 (Manifest V3).

## 지원 번역 서비스

- **Chrome 내장 번역기** — API 키 불필요, 온디바이스 (Chrome 138+ 데스크톱)
- **Google 번역** — Cloud Translation v2(API 키) / v3(프로젝트 ID + 액세스 토큰)
- **DeepL** — 무료(`:fx`)/Pro 자동 판별
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
