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

export interface RecordVisibilityResponse {
  id: number;
  visibility: RecordVisibility;
  sharedAt: string | null;
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

export const recordApi = {
  async getRecords(token: string): Promise<RecordListResponse> {
    const response = await fetch(apiUrl('/api/v1/records'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },

  async getToday(token: string): Promise<RecordResponse | null> {
    const response = await fetch(apiUrl('/api/v1/records/today'), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },

  async create(token: string, request: RecordCreateRequest): Promise<RecordCreateResponse> {
    const response = await fetch(apiUrl('/api/v1/records'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },

  async update(
    token: string,
    recordId: number,
    request: RecordUpdateRequest
  ): Promise<RecordUpdateResponse> {
    const response = await fetch(apiUrl(`/api/v1/records/${recordId}`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },

  async updateVisibility(
    token: string,
    recordId: number,
    visibility: RecordVisibility
  ): Promise<RecordVisibilityResponse> {
    const response = await fetch(apiUrl(`/api/v1/records/${recordId}/visibility`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ visibility }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorMessage(response));
    }

    return response.json();
  },
};
