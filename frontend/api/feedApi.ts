export type FeedCategory = 'all' | 'job' | 'study' | 'workout' | 'hobby';

export interface FeedOwnerSummary {
  userId: number | null;
  nickname: string | null;
  profileImageUrl: string | null;
}

export interface FeedItemResponse {
  pathId: number | null;
  recordId: number;
  title: string | null;
  content: string | null;
  status: string | null;
  owner: FeedOwnerSummary;
  categoryCode: string | null;
  reactionCount: number;
  commentCount: number;
  isReacted: boolean;
  sharedAt: string | null;
  createdAt: string;
}

export interface FeedResponse {
  items: FeedItemResponse[];
  hasNext: boolean;
  nextCursor: string | null;
}

export interface WeeklyTop3ItemResponse {
  rank: number;
  pathId: number;
  title: string;
  status: string | null;
  owner: FeedOwnerSummary;
  reactionCount: number;
  isReacted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTop3Response {
  items: WeeklyTop3ItemResponse[];
  window: {
    from: string;
    to: string;
  };
}

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured) return '';
  return configured.endsWith('/') ? configured.slice(0, -1) : configured;
};

const apiBaseUrl = resolveApiBaseUrl();
const apiUrl = (path: string) => `${apiBaseUrl}${path}`;
const FEED_CACHE_TTL_MS = 20_000;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();

const parseErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.message || '요청 처리에 실패했습니다.';
  } catch {
    return '요청 처리에 실패했습니다.';
  }
};

const buildApiError = async (response: Response) => {
  const error = new Error(await parseErrorMessage(response)) as Error & { status?: number };
  error.status = response.status;
  return error;
};

const createAuthHeaders = (token?: string | null) => {
  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

const readCache = <T,>(key: string): T | null => {
  const cached = responseCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    responseCache.delete(key);
    return null;
  }
  return cached.value as T;
};

const writeCache = <T,>(key: string, value: T) => {
  responseCache.set(key, {
    expiresAt: Date.now() + FEED_CACHE_TTL_MS,
    value,
  });
};

export const feedApi = {
  async getFeed(params: {
    token?: string | null;
    category?: FeedCategory;
    cursor?: string | null;
    size?: number;
  }): Promise<FeedResponse> {
    const query = new URLSearchParams();
    query.set('size', String(params.size ?? 20));
    if (params.category && params.category !== 'all') {
      query.set('category', params.category);
    }
    if (params.cursor) {
      query.set('cursor', params.cursor);
    }

    const cacheKey = `feed:${params.token ?? 'guest'}:${query.toString()}`;
    const cached = readCache<FeedResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(apiUrl(`/api/v1/feed?${query.toString()}`), {
      method: 'GET',
      headers: createAuthHeaders(params.token),
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const data = await response.json();
    writeCache(cacheKey, data);
    return data;
  },

  async getWeeklyTop3(token?: string | null): Promise<WeeklyTop3Response> {
    const cacheKey = `weekly-top3:${token ?? 'guest'}`;
    const cached = readCache<WeeklyTop3Response>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(apiUrl('/api/v1/feed/weekly-top3'), {
      method: 'GET',
      headers: createAuthHeaders(token),
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const data = await response.json();
    writeCache(cacheKey, data);
    return data;
  },
};
