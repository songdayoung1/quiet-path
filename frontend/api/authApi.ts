import { OnboardingStatus, MeResponse } from '../types';
import { apiFetch, apiUrl, buildApiError, parseErrorMessage } from './apiClient';

/**
 * Auth API
 * - 실제 카카오 로그인: 백엔드 /api/v1/auth/** 사용
 * - 개발 편의: DEV 모드에서만 mock code(new_user/existing_user/error_user) 유지
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_CODES = new Set(['new_user', 'existing_user', 'error_user']);
const REFRESH_RETRY_DELAYS = [120, 250];
let refreshRequest: Promise<{ token: string }> | null = null;
export const isMockAccessToken = (token: string) =>
  token.startsWith('mock_token_') || token.startsWith('mock_access_');
const mockStatusByToken = (token: string): OnboardingStatus =>
  token.includes('new') ? 'NEW' : 'EXISTING';

export const authApi = {
  startKakaoLogin: async (): Promise<void> => {
    const response = await fetch(apiUrl('/api/v1/auth/kakao/start-url'), {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const message = await parseErrorMessage(response);
      if (import.meta.env.DEV && message.includes('인증 설정값이 누락되었습니다')) {
        throw new Error(
          '카카오 로그인 설정이 비어 있어요. 루트 `.env.local` 또는 `backend/.env.local`에 `KAKAO_REST_API_KEY`를 넣어주세요.'
        );
      }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data?.redirectUrl) {
      throw new Error('카카오 로그인 시작 주소를 만들지 못했습니다.');
    }

    window.location.href = data.redirectUrl;
  },

  loginWithKakao: async (
    code: string
  ): Promise<{ token: string; onboardingStatus: OnboardingStatus }> => {
    if (import.meta.env.DEV && MOCK_CODES.has(code)) {
      await delay(1500);
      if (code === 'new_user') {
        return { token: 'mock_token_new', onboardingStatus: 'NEW' };
      }
      if (code === 'existing_user') {
        return { token: 'mock_token_existing', onboardingStatus: 'EXISTING' };
      }
      throw new Error('카카오 로그인에 실패했습니다. (Mock Error)');
    }

    const response = await fetch(
      apiUrl(`/api/v1/auth/kakao/callback?code=${encodeURIComponent(code)}`),
      {
        method: 'GET',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    return {
      token: data.token,
      onboardingStatus: data.onboardingStatus,
    };
  },

  getMe: async (
    token: string,
    options?: { retryOnUnauthorized?: boolean }
  ): Promise<MeResponse> => {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      await delay(300);
      if (mockStatusByToken(token) === 'NEW') {
          return { id: 'u1', name: '새내기', onboardingStatus: 'NEW' };
      }
      return { id: 'u2', name: '단골손님', onboardingStatus: 'EXISTING' };
    }

    const response = await apiFetch(
      '/api/v1/auth/me',
      {
        method: 'GET',
        credentials: 'include',
      },
      {
        accessToken: token,
        retryOnUnauthorized: options?.retryOnUnauthorized ?? true,
      }
    );

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.nickname ?? '사용자',
      onboardingStatus: data.onboardingStatus,
    };
  },

  refresh: async (): Promise<{ token: string }> => {
    if (refreshRequest) {
      return refreshRequest;
    }

    refreshRequest = refreshAccessTokenWithRetry();
    try {
      return await refreshRequest;
    } finally {
      refreshRequest = null;
    }
  },

  logout: async (): Promise<void> => {
    const response = await fetch(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }
  },

  updateNickname: async (token: string, nickname: string): Promise<MeResponse> => {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      return {
        id: mockStatusByToken(token) === 'NEW' ? 'u1' : 'u2',
        name: nickname,
        onboardingStatus: mockStatusByToken(token),
      };
    }

    const response = await apiFetch(
      '/api/v1/auth/me/nickname',
      {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
      },
      { accessToken: token }
    );

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    return {
      id: String(data.id),
      name: data.nickname ?? nickname,
      onboardingStatus: data.onboardingStatus,
    };
  },
};

const refreshAccessTokenWithRetry = async (): Promise<{ token: string }> => {
  for (let attempt = 0; attempt <= REFRESH_RETRY_DELAYS.length; attempt += 1) {
    const response = await fetch(apiUrl('/api/v1/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      return { token: data.token };
    }

    const error = await buildApiError(response);
    const retryDelay = REFRESH_RETRY_DELAYS[attempt];
    if (error.code !== 'REFRESH_TOKEN_INVALID' || retryDelay === undefined) {
      throw error;
    }
    await delay(retryDelay);
  }

  throw new Error('세션을 갱신하지 못했습니다.');
};
