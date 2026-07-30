import { apiFetch, buildApiError } from './apiClient';

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

const jsonHeaders = { 'Content-Type': 'application/json' };

export const notificationApi = {
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
