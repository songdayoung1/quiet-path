import { apiFetch, buildApiError } from './apiClient';

export interface CommentItemResponse {
  commentId: number;
  userId: number | null;
  nickname: string | null;
  profileImageUrl: string | null;
  content: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentListResponse {
  items: CommentItemResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CommentCreateResponse {
  commentId: number;
  recordId: number;
  userId: number;
  content: string;
  commentCount: number;
  deleted: boolean;
  createdAt: string;
}

export interface CommentUpdateResponse {
  commentId: number;
  recordId: number;
  commentCount: number;
  content: string;
  updatedAt: string;
}

export interface CommentDeleteResponse {
  commentId: number;
  recordId: number;
  commentCount: number;
  deleted: boolean;
  deletedAt: string | null;
}

export const commentApi = {
  async getComments(token: string, recordId: number, size = 50, page = 0): Promise<CommentListResponse> {
    const query = new URLSearchParams({
      recordId: String(recordId),
      page: String(page),
      size: String(size),
    });

    const response = await apiFetch(`/api/v1/comments?${query.toString()}`, {
      method: 'GET',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async createComment(token: string, recordId: number, content: string): Promise<CommentCreateResponse> {
    const response = await apiFetch('/api/v1/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recordId,
        content,
      }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async updateComment(token: string, commentId: number, content: string): Promise<CommentUpdateResponse> {
    const response = await apiFetch(`/api/v1/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },

  async deleteComment(token: string, commentId: number): Promise<CommentDeleteResponse> {
    const response = await apiFetch(`/api/v1/comments/${commentId}`, {
      method: 'DELETE',
    }, {
      accessToken: token,
    });

    if (!response.ok) {
      throw await buildApiError(response);
    }

    return response.json();
  },
};
