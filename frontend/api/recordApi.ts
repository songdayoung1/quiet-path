import { apiFetch, buildApiError } from './apiClient';

export type RecordVisibility = 'PUBLIC' | 'PRIVATE';
export type RecordImageAction = 'KEEP' | 'REPLACE' | 'REMOVE';

export interface RecordImagePosition {
  imagePositionX?: number;
  imagePositionY?: number;
  imageScale?: number;
}

export interface RecordCreateRequest extends RecordImagePosition {
  content: string;
  oneWordText?: string;
  tomorrowText?: string;
  moodCode?: string;
  visibility: RecordVisibility;
}

export interface RecordUpdateRequest extends RecordImagePosition {
  content: string;
  oneWordText?: string;
  tomorrowText?: string;
  moodCode?: string;
  imageAction: RecordImageAction;
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
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  imageScale?: number | null;
  visibility: RecordVisibility;
  isPinned?: boolean | null;
  sharedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type RecordCreateResponse = RecordResponse;

export interface RecordDetailResponse extends RecordImagePosition {
  id: number;
  imageUrl?: string | null;
}

export interface RecordUpdateResponse {
  id: number;
  content: string;
  oneWordText?: string | null;
  tomorrowText?: string | null;
  moodCode: string | null;
  imageUrl?: string | null;
  imagePositionX?: number | null;
  imagePositionY?: number | null;
  imageScale?: number | null;
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

  async getDetail(token: string, recordId: number): Promise<RecordDetailResponse> {
    const response = await apiFetch(`/api/v1/records/${recordId}`, {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async create(token: string, request: RecordCreateRequest, image?: File | null): Promise<RecordCreateResponse> {
    const formData = buildRecordFormData(request, image);
    const response = await apiFetch('/api/v1/records', {
      method: 'POST',
      body: formData,
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
    request: RecordUpdateRequest,
    image?: File | null
  ): Promise<RecordUpdateResponse> {
    const formData = buildRecordFormData(request, image);
    const response = await apiFetch(`/api/v1/records/${recordId}`, {
      method: 'PATCH',
      body: formData,
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

const buildRecordFormData = (request: object, image?: File | null) => {
  const formData = new FormData();
  formData.append(
    'record',
    new Blob([JSON.stringify(request)], { type: 'application/json' })
  );
  if (image) {
    formData.append('image', image, image.name);
  }
  return formData;
};
