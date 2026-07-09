import { apiFetch, buildApiError } from './apiClient';

export type RecordVisibility = 'PUBLIC' | 'PRIVATE';

export interface RecordCreateRequest {
  content: string;
  oneWordText?: string;
  tomorrowText?: string;
  moodCode?: string;
  imageUrl?: string;
  visibility: RecordVisibility;
}

export interface RecordUpdateRequest {
  content: string;
  oneWordText?: string;
  tomorrowText?: string;
  moodCode?: string;
  imageUrl?: string;
}

export interface RecordResponse {
  id: number;
  pathId: number;
  directionName?: string | null;
  directionText?: string | null;
  categoryCode?: string | null;
  recordDate: string;
  content: string;
  oneWordText?: string | null;
  tomorrowText?: string | null;
  moodCode: string | null;
  imageUrl?: string | null;
  visibility: RecordVisibility;
  isPinned?: boolean | null;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type RecordCreateResponse = RecordResponse;

export interface RecordUpdateResponse {
  id: number;
  content: string;
  oneWordText?: string | null;
  tomorrowText?: string | null;
  moodCode: string | null;
  imageUrl?: string | null;
  visibility: RecordVisibility;
  updatedAt?: string;
}

export interface RecordListResponse {
  items: RecordResponse[];
}

export interface RecordMonthlyResponse {
  year: number;
  month: number;
  firstRecordYear?: number | null;
  firstRecordMonth?: number | null;
  recordsCount: number;
  photoCount: number;
  photoCoverage: number;
  items: RecordResponse[];
}

export interface RecordVisibilityResponse {
  id: number;
  visibility: RecordVisibility;
  sharedAt: string | null;
}

export interface RecordPinResponse {
  id: number;
  isPinned: boolean;
}

export const recordApi = {
  async getRecords(token: string): Promise<RecordListResponse> {
    const response = await apiFetch('/api/v1/records', {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async getMonthly(token: string, year: number, month: number): Promise<RecordMonthlyResponse> {
    const query = new URLSearchParams({
      year: String(year),
      month: String(month),
    });

    const response = await apiFetch(`/api/v1/records/monthly?${query.toString()}`, {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async getToday(token: string): Promise<RecordResponse | null> {
    const response = await apiFetch('/api/v1/records/today', {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async create(token: string, request: RecordCreateRequest): Promise<RecordCreateResponse> {
    const response = await apiFetch('/api/v1/records', {
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

  async update(
    token: string,
    recordId: number,
    request: RecordUpdateRequest
  ): Promise<RecordUpdateResponse> {
    const response = await apiFetch(`/api/v1/records/${recordId}`, {
      method: 'PATCH',
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

  async updateVisibility(
    token: string,
    recordId: number,
    visibility: RecordVisibility
  ): Promise<RecordVisibilityResponse> {
    const response = await apiFetch(`/api/v1/records/${recordId}/visibility`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ visibility }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async updatePin(token: string, recordId: number, pinned: boolean): Promise<RecordPinResponse> {
    const response = await apiFetch(`/api/v1/records/${recordId}/pin`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pinned }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async delete(token: string, recordId: number): Promise<void> {
    const response = await apiFetch(`/api/v1/records/${recordId}`, {
      method: 'DELETE',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }
  },
};
