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

export const pathApi = {
  async getActive(token: string): Promise<PathActiveResponse> {
    const response = await fetch(apiUrl('/api/v1/paths/active'), {
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

  async create(token: string, request: PathCreateRequest): Promise<PathCreateResponse> {
    const response = await fetch(apiUrl('/api/v1/paths'), {
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
};
