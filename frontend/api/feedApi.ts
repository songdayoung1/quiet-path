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

const parseErrorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body?.message || '요청 처리에 실패했습니다.';
  } catch {
    return '요청 처리에 실패했습니다.';
  }
};

const createAuthHeaders = (token?: string | null) => {
  if (!token) {
    return undefined;
  }

  return {
    Authorization: `Bearer ${token}`,
  };
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

    const response = await fetch(apiUrl(`/api/v1/feed?${query.toString()}`), {
      method: 'GET',
      headers: createAuthHeaders(params.token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },

  async getWeeklyTop3(token?: string | null): Promise<WeeklyTop3Response> {
    const response = await fetch(apiUrl('/api/v1/feed/weekly-top3'), {
      method: 'GET',
      headers: createAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },
};
