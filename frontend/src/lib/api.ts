const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body } = options;

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/v1/auth/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    role?: string;
  }) {
    return this.request('/v1/auth/auth/register', {
      method: 'POST',
      body: data,
    });
  }

  async getMe(token: string) {
    return this.request('/v1/auth/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Challenges endpoints
  async getChallenges(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    category_id?: string;
    difficulty?: string;
    featured_only?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/v1/core/challenges/${query ? `?${query}` : ''}`);
  }

  async getChallenge(id: string) {
    return this.request(`/v1/core/challenges/${id}`);
  }

  async createChallenge(token: string, data: {
    title: string;
    description: string;
    category_id?: string;
    difficulty?: string;
    tags?: string[];
    budget?: number;
    deadline?: string;
  }) {
    return this.request('/v1/core/challenges/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
  }

  // Interactions endpoints
  async createInteraction(token: string, data: {
    challenge_id: string;
    message?: string;
  }) {
    return this.request('/v1/match/interactions/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
  }

  async getMyInteractions(token: string, params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/v1/match/interactions/${query ? `?${query}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Reactions endpoints
  async createReaction(token: string, data: {
    challenge_id: string;
    reaction_type: 'like' | 'bookmark';
  }) {
    return this.request('/v1/match/reactions/', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
  }

  async deleteReaction(token: string, reactionId: string) {
    return this.request(`/v1/match/reactions/${reactionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

export const api = new ApiClient();
export default api;
