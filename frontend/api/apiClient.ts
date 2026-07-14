type RefreshAccessTokenHandler = () => Promise<string | null>;

export type ApiErrorWithStatus = Error & { status?: number; code?: string };

let refreshAccessTokenHandler: RefreshAccessTokenHandler | null = null;

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured) return '';
  return configured.endsWith('/') ? configured.slice(0, -1) : configured;
};

const apiBaseUrl = resolveApiBaseUrl();

export const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

export const configureApiClient = (options: {
  refreshAccessToken?: RefreshAccessTokenHandler | null;
}) => {
  refreshAccessTokenHandler = options.refreshAccessToken ?? null;
};

const parseErrorPayload = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const parseErrorMessage = async (response: Response) => {
  const body = await parseErrorPayload(response);
  return body?.message || '요청 처리에 실패했습니다.';
};

export const buildApiError = async (response: Response) => {
  const body = await parseErrorPayload(response);
  const message = body?.message || '요청 처리에 실패했습니다.';
  const resolvedMessage =
    response.status === 401 && message === '요청 처리에 실패했습니다.'
      ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
      : message;
  const error = new Error(resolvedMessage) as ApiErrorWithStatus;
  error.status = response.status;
  error.code = body?.code;
  return error;
};

export const buildApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallbackMessage;
};

export const apiFetch = async (
  path: string,
  init: RequestInit = {},
  options?: {
    accessToken?: string | null;
    retryOnUnauthorized?: boolean;
  }
) => {
  const request = async (accessToken?: string | null) => {
    const headers = new Headers(init.headers);
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    return fetch(apiUrl(path), {
      ...init,
      headers,
    });
  };

  const shouldRetry = options?.retryOnUnauthorized ?? !!options?.accessToken;
  let response = await request(options?.accessToken ?? null);

  if (response.status !== 401 || !shouldRetry || !options?.accessToken || !refreshAccessTokenHandler) {
    return response;
  }

  const refreshedToken = await refreshAccessTokenHandler();
  if (!refreshedToken) {
    return response;
  }

  response = await request(refreshedToken);
  return response;
};
