import { OnboardingStatus, MeResponse } from '../types';

/**
 * Auth API
 * - 실제 카카오 로그인: 백엔드 /api/v1/auth/** 사용
 * - 개발 편의: DEV 모드에서만 mock code(new_user/existing_user/error_user) 유지
 */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_CODES = new Set(['new_user', 'existing_user', 'error_user']);

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured) return '';
  return configured.endsWith('/') ? configured.slice(0, -1) : configured;
};

const apiBaseUrl = resolveApiBaseUrl();
const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

const parseErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.message || '요청 처리에 실패했습니다.';
  } catch {
    return '요청 처리에 실패했습니다.';
  }
};

export const authApi = {
  startKakaoLogin: () => {
    window.location.href = apiUrl('/api/v1/auth/kakao/start');
  },

  loginWithKakao: async (code: string): Promise<{ token: string; onboardingStatus: OnboardingStatus }> => {
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

  getMe: async (token: string): Promise<MeResponse> => {
    if (import.meta.env.DEV && token.startsWith('mock_token_')) {
      await delay(300);
      if (token === 'mock_token_new') {
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

  logout: async (token: string): Promise<void> => {
    if (import.meta.env.DEV && token.startsWith('mock_token_')) {
      return;
    }
    await fetch(apiUrl('/api/v1/auth/logout'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  updateNickname: async (token: string, nickname: string): Promise<MeResponse> => {
    if (import.meta.env.DEV && token.startsWith('mock_token_')) {
      return {
        id: token === 'mock_token_new' ? 'u1' : 'u2',
        name: nickname,
        onboardingStatus: token === 'mock_token_new' ? 'NEW' : 'EXISTING',
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
