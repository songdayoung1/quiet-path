import { apiFetch, buildApiError } from './apiClient';

export interface PathCreateRequest {
  directionName: string;
  categoryCode: string;
  directionText?: string;
  reviewAt: string;
}

export interface PathCreateResponse {
  pathId: number;
  categoryCode: string;
  status: string;
  createdAt: string;
  reviewAt: string;
}

export interface PathActiveResponse {
  pathId?: number | null;
  categoryCode?: string;
  directionName?: string;
  directionText?: string;
  status?: string;
  createdAt?: string;
  reviewAt?: string;
}

export interface PathFinishResponse {
  pathId: number;
  status: string;
  completedAt: string;
}

export const pathApi = {
  async getActive(token: string): Promise<PathActiveResponse> {
    const response = await apiFetch('/api/v1/paths/active', {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async create(token: string, request: PathCreateRequest): Promise<PathCreateResponse> {
    const response = await apiFetch('/api/v1/paths', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async finish(token: string, pathId: number): Promise<PathFinishResponse> {
    const response = await apiFetch(`/api/v1/paths/${pathId}/finish`, {
      method: 'POST',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },
};
