/// <reference types="vite/client" />

/** 빌드 타임 플래그: false면 Google 번역 제외(심사용 빌드). vite.config.ts define 참고. */
declare const __INCLUDE_GOOGLE__: boolean

/** 빌드 스크립트(manifest.config.ts / vite.config.ts)에서만 사용. @types/node 없이 최소 선언. */
declare const process: { env: Record<string, string | undefined> }
