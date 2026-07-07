/**
 * Google Cloud Translation v3용 OAuth 토큰 관리.
 * chrome.identity.getAuthToken은 Chrome 프로필의 Google 계정으로 토큰을 발급하고
 * 자동으로 캐시/갱신한다 → 수동으로 액세스 토큰을 붙여넣을 필요가 없다.
 * manifest의 oauth2.client_id / scopes를 사용한다.
 */

/** getAuthToken은 SDK 버전에 따라 string 또는 {token} 객체를 반환 → 정규화 */
function normalize(res: unknown): string | undefined {
  if (typeof res === 'string') return res
  if (res && typeof res === 'object' && 'token' in res) return (res as { token?: string }).token
  return undefined
}

export async function getGoogleToken(interactive = false): Promise<string> {
  const res = await chrome.identity.getAuthToken({ interactive })
  const token = normalize(res)
  if (!token) {
    throw new Error(
      'Google 계정 토큰을 가져오지 못했습니다. 설정에서 "Google 계정 연결"을 먼저 실행하세요.',
    )
  }
  return token
}

/** 401 등으로 만료된 캐시 토큰을 제거해 다음 요청에서 새로 발급받게 한다. */
export async function clearGoogleToken(token: string): Promise<void> {
  try {
    await chrome.identity.removeCachedAuthToken({ token })
  } catch {
    /* 무시 */
  }
}
