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
  expired?: boolean;
  coverImage?: PathCoverImageResponse | null;
}

export interface PathCoverImageResponse {
  imageUrl: string;
  positionX: number;
  positionY: number;
  scale: number;
}

export interface PathCoverImageUpdate {
  imageFile?: File | null;
  positionX: number;
  positionY: number;
  scale: number;
}

export interface PathFinishResponse {
  pathId: number;
  status: string;
  completedAt: string;
}

export interface PathReviewExtendResponse {
  pathId: number;
  status: string;
  reviewAt: string;
  expired: boolean;
}

export interface PathDetailRecordItem {
  recordId: number;
  date: string;
  preview: string;
  oneWordText?: string | null;
  moodText?: string | null;
}

export interface PastPathListItem {
  pathId: number;
  createdAt: string;
  completedAt?: string | null;
  directionName: string;
}

export interface PastPathListResponse {
  items: PastPathListItem[];
  nextCursor?: string | null;
}

export interface PathSummaryPayload {
  headline: string;
  body: string;
  perspective?: string | null;
  observations?: string[] | null;
  improvements?: string[] | null;
  suggestions?: string[] | null;
  closing: string;
}

export interface PathDetailResponse {
  pathId: number;
  directionName: string;
  directionText: string;
  status: string;
  createdAt: string;
  reviewAt: string;
  completedAt?: string | null;
  summaryStatus: 'LOCKED' | 'EMPTY' | 'READY' | 'PROCESSING' | 'DONE' | 'FAILED';
  summary: PathSummaryPayload | null;
  records: PathDetailRecordItem[];
}

export interface PathSummaryStartResponse {
  pathId: number;
  summaryStatus: 'PROCESSING';
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

  async extendReviewAt(token: string, pathId: number, reviewAt: string): Promise<PathReviewExtendResponse> {
    const response = await apiFetch(`/api/v1/paths/${pathId}/review-at`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reviewAt }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async updateCoverImage(
    token: string,
    pathId: number,
    request: PathCoverImageUpdate,
  ): Promise<PathCoverImageResponse> {
    const formData = new FormData();
    formData.append('cover', new Blob([JSON.stringify({
      positionX: request.positionX,
      positionY: request.positionY,
      scale: request.scale,
    })], { type: 'application/json' }));
    if (request.imageFile) {
      formData.append('image', request.imageFile);
    }

    const response = await apiFetch(`/api/v1/paths/${pathId}/cover-image`, {
      method: 'PUT',
      body: formData,
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async deleteCoverImage(token: string, pathId: number): Promise<void> {
    const response = await apiFetch(`/api/v1/paths/${pathId}/cover-image`, {
      method: 'DELETE',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }
  },

  async getDetail(token: string, pathId: number): Promise<PathDetailResponse> {
    const response = await apiFetch(`/api/v1/paths/${pathId}`, {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async getPastPaths(token: string, cursor?: string | null, size = 20): Promise<PastPathListResponse> {
    const query = new URLSearchParams({
      status: 'FINISHED',
      size: String(size),
    });
    if (cursor) {
      query.set('cursor', cursor);
    }

    const response = await apiFetch(`/api/v1/paths?${query.toString()}`, {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async requestSummary(token: string, pathId: number): Promise<PathSummaryStartResponse> {
    const response = await apiFetch(`/api/v1/paths/${pathId}/summary`, {
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
