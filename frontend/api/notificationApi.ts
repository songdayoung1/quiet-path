import { apiFetch, buildApiError } from './apiClient';
import { isMockAccessToken } from './authApi';

export interface NotificationPreferenceResponse {
  reactionEnabled: boolean;
  commentEnabled: boolean;
  reviewReminderEnabled: boolean;
  reviewReminderTime: string;
  timeZone: string;
}

export interface NotificationPreferenceUpdateRequest extends NotificationPreferenceResponse {}

export interface WebPushConfigResponse {
  enabled: boolean;
  publicKey?: string | null;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushTestResponse {
  deliveredCount: number;
  expiredCount: number;
  failedCount: number;
}

export interface NotificationActor {
  userId?: number | null;
  nickname?: string | null;
  profileImageUrl?: string | null;
}

export interface NotificationItem {
  notificationId: number;
  type: string;
  actor: NotificationActor;
  targetType: string;
  targetId: number;
  message: string;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface NotificationReadResponse {
  notificationId: number;
  read: boolean;
  readAt?: string | null;
}

export interface NotificationReadAllResponse {
  updatedCount: number;
}

export interface NotificationUnreadCountResponse {
  unreadCount: number;
}

const jsonHeaders = { 'Content-Type': 'application/json' };
const mockReadNotificationIds = new Set<number>();
const notificationListRequests = new Map<string, Promise<NotificationListResponse>>();

const mockNotifications = (): NotificationItem[] => [
  {
    notificationId: 1003,
    type: 'COMMENT_CREATED',
    actor: { userId: 31, nickname: '고요한밤', profileImageUrl: null },
    targetType: 'RECORD',
    targetId: 203,
    message: '내 기록에 댓글을 남겼어요.',
    read: mockReadNotificationIds.has(1003),
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    readAt: null,
  },
  {
    notificationId: 1002,
    type: 'REACTION_CREATED',
    actor: { userId: 24, nickname: '민들레', profileImageUrl: null },
    targetType: 'RECORD',
    targetId: 202,
    message: '내 기록에 공감했어요.',
    read: mockReadNotificationIds.has(1002),
    createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
    readAt: null,
  },
  {
    notificationId: 1001,
    type: 'PATH_REVIEW_REMINDER',
    actor: { userId: null, nickname: '시스템', profileImageUrl: null },
    targetType: 'PATH',
    targetId: 12,
    message: "'천천히 걷기'에서 걸어온 장면을 돌아볼 시간이에요.",
    read: mockReadNotificationIds.has(1001),
    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    readAt: null,
  },
];

export const notificationApi = {
  async getNotifications(
    token: string,
    query: { page?: number; size?: number; unreadOnly?: boolean } = {}
  ): Promise<NotificationListResponse> {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      const filtered = query.unreadOnly
        ? mockNotifications().filter((item) => !item.read)
        : mockNotifications();
      const page = query.page ?? 0;
      const size = query.size ?? 20;
      const start = page * size;
      return {
        items: filtered.slice(start, start + size),
        page,
        size,
        totalElements: filtered.length,
        totalPages: Math.ceil(filtered.length / size),
      };
    }
    const params = new URLSearchParams();
    if (query.page !== undefined) params.set('page', String(query.page));
    if (query.size !== undefined) params.set('size', String(query.size));
    if (query.unreadOnly !== undefined) params.set('unreadOnly', String(query.unreadOnly));
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const requestKey = `${token}:${suffix}`;
    const existingRequest = notificationListRequests.get(requestKey);
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const response = await apiFetch(
        `/api/v1/notifications${suffix}`,
        { method: 'GET' },
        { accessToken: token }
      );
      if (!response.ok) throw await buildApiError(response);
      return response.json();
    })();
    notificationListRequests.set(requestKey, request);

    try {
      return await request;
    } finally {
      if (notificationListRequests.get(requestKey) === request) {
        notificationListRequests.delete(requestKey);
      }
    }
  },

  async getUnreadCount(token: string): Promise<NotificationUnreadCountResponse> {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      return {
        unreadCount: mockNotifications().filter((item) => !item.read).length,
      };
    }
    const response = await apiFetch(
      '/api/v1/notifications/unread-count',
      { method: 'GET' },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async readNotification(token: string, notificationId: number): Promise<NotificationReadResponse> {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      mockReadNotificationIds.add(notificationId);
      return {
        notificationId,
        read: true,
        readAt: new Date().toISOString(),
      };
    }
    const response = await apiFetch(
      `/api/v1/notifications/${notificationId}/read`,
      { method: 'PATCH' },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async readAll(token: string): Promise<NotificationReadAllResponse> {
    if (import.meta.env.DEV && isMockAccessToken(token)) {
      const unreadItems = mockNotifications().filter((item) => !item.read);
      unreadItems.forEach((item) => mockReadNotificationIds.add(item.notificationId));
      return { updatedCount: unreadItems.length };
    }
    const response = await apiFetch(
      '/api/v1/notifications/read-all',
      { method: 'PATCH' },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async getPreferences(token: string): Promise<NotificationPreferenceResponse> {
    const response = await apiFetch('/api/v1/notifications/preferences', { method: 'GET' }, { accessToken: token });
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async updatePreferences(
    token: string,
    request: NotificationPreferenceUpdateRequest
  ): Promise<NotificationPreferenceResponse> {
    const response = await apiFetch(
      '/api/v1/notifications/preferences',
      { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(request) },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async getWebPushConfig(token: string): Promise<WebPushConfigResponse> {
    const response = await apiFetch('/api/v1/notifications/push/config', { method: 'GET' }, { accessToken: token });
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },

  async register(token: string, request: WebPushSubscriptionPayload): Promise<void> {
    const response = await apiFetch(
      '/api/v1/notifications/push/subscriptions',
      { method: 'POST', headers: jsonHeaders, body: JSON.stringify(request) },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
  },

  async unsubscribe(token: string, endpoint: string): Promise<void> {
    const response = await apiFetch(
      '/api/v1/notifications/push/subscriptions',
      { method: 'DELETE', headers: jsonHeaders, body: JSON.stringify({ endpoint }) },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
  },

  async sendTestPush(token: string): Promise<WebPushTestResponse> {
    const response = await apiFetch(
      '/api/v1/notifications/push/test',
      { method: 'POST' },
      { accessToken: token }
    );
    if (!response.ok) throw await buildApiError(response);
    return response.json();
  },
};
