import { apiFetch, buildApiError } from './apiClient';

export type FeedCategory = 'all' | 'job' | 'study' | 'workout' | 'hobby' | 'cert';

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

export interface WeeklyTop3Response {
  items: WeeklyTop3ItemResponse[];
  window: {
    from: string;
    to: string;
  };
}

const FEED_CACHE_TTL_MS = 20_000;
const responseCache = new Map<string, { expiresAt: number; value: unknown }>();

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

const invalidateCacheByPrefix = (prefix: string) => {
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
  }
};

export const feedApi = {
  async getFeed(params: {
    token?: string | null;
    category?: FeedCategory;
    cursor?: string | null;
    size?: number;
    bypassCache?: boolean;
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
    const cached = params.bypassCache ? null : readCache<FeedResponse>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await apiFetch(`/api/v1/feed?${query.toString()}`, {
      method: 'GET',
    }, {
      accessToken: params.token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const data = await response.json();
    writeCache(cacheKey, data);
    return data;
  },

  async getWeeklyTop3(token?: string | null, options?: { bypassCache?: boolean }): Promise<WeeklyTop3Response> {
    const cacheKey = `weekly-top3:${token ?? 'guest'}`;
    const cached = options?.bypassCache ? null : readCache<WeeklyTop3Response>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await apiFetch('/api/v1/feed/weekly-top3', {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    const data = await response.json();
    writeCache(cacheKey, data);
    return data;
  },

  invalidateFeedCache() {
    invalidateCacheByPrefix('feed:');
  },

  invalidateWeeklyTop3Cache() {
    invalidateCacheByPrefix('weekly-top3:');
  },

  invalidateCommunityCache() {
    invalidateCacheByPrefix('feed:');
    invalidateCacheByPrefix('weekly-top3:');
  },
};
