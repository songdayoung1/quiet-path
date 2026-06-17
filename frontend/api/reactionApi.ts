import { apiFetch, buildApiError } from './apiClient';

const TARGET_TYPE = 'RECORD';

export interface ReactionMutationResponse {
  targetType: string;
  targetId: number;
  reacted: boolean;
  reactionCount: number;
  reactionId?: number;
  reactedAt?: string;
}

export const reactionApi = {
  async createReaction(token: string, targetId: number): Promise<ReactionMutationResponse> {
    const response = await apiFetch('/api/v1/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetType: TARGET_TYPE,
        targetId,
      }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async deleteReaction(token: string, targetId: number): Promise<ReactionMutationResponse> {
    const response = await apiFetch('/api/v1/reactions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetType: TARGET_TYPE,
        targetId,
      }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },
};
