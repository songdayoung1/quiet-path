import { OnboardingStatus, MeResponse } from '../types';
import { apiUrl, parseErrorMessage } from './apiClient';

/**
 * Auth API
 * - 실제 카카오 로그인: 백엔드 /api/v1/auth/** 사용
 * - 개발 편의: DEV 모드에서만 mock code(new_user/existing_user/error_user) 유지
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_CODES = new Set(['new_user', 'existing_user', 'error_user']);
export const isMockAccessToken = (token: string) =>
  token.startsWith('mock_token_') || token.startsWith('mock_access_');
const mockStatusByToken = (token: string): OnboardingStatus =>
  token.includes('new') ? 'NEW' : 'EXISTING';

export const authApi = {
  startKakaoLogin: async (): Promise<void> => {
    const response = await fetch(apiUrl('/api/v1/auth/kakao/start-url'), {
      method: 'GET',
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
  ): Promise<{ token: string; refreshToken: string; onboardingStatus: OnboardingStatus }> => {
    if (import.meta.env.DEV && MOCK_CODES.has(code)) {
      await delay(1500);
      if (code === 'new_user') {
        return { token: 'mock_token_new', refreshToken: 'mock_refresh_new', onboardingStatus: 'NEW' };
      }
      if (code === 'existing_user') {
        return { token: 'mock_token_existing', refreshToken: 'mock_refresh_existing', onboardingStatus: 'EXISTING' };
      }
      throw new Error('카카오 로그인에 실패했습니다. (Mock Error)');
    }

    const response = await fetch(
      apiUrl(`/api/v1/auth/kakao/callback?code=${encodeURIComponent(code)}`),
      {
        method: 'GET',
      }
    );

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    return {
      token: data.token,
      refreshToken: data.refreshToken,
      onboardingStatus: data.onboardingStatus,
    };
  },

  getMe: async (token: string): Promise<MeResponse> => {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      await delay(300);
      if (mockStatusByToken(token) === 'NEW') {
          return { id: 'u1', name: '새내기', onboardingStatus: 'NEW' };
      }
      return { id: 'u2', name: '단골손님', onboardingStatus: 'EXISTING' };
    }

    const response = await fetch(apiUrl('/api/v1/auth/me'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

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

  refresh: async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
    if (import.meta.env.DEV && refreshToken.startsWith('mock_refresh_')) {
      await delay(250);
      if (refreshToken.includes('new')) {
        return { token: `mock_access_new_${Date.now()}`, refreshToken: 'mock_refresh_new' };
      }
      return { token: `mock_access_existing_${Date.now()}`, refreshToken: 'mock_refresh_existing' };
    }

    const response = await fetch(apiUrl('/api/v1/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    const data = await response.json();
    return {
      token: data.token,
      refreshToken: data.refreshToken,
    };
  },

  logout: async (token: string): Promise<void> => {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      return;
    }
    const response = await fetch(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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

    const response = await fetch(apiUrl('/api/v1/auth/me/nickname'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nickname }),
    });

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
