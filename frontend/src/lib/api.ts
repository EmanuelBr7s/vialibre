import type {
  Challenge,
  ChallengeApplicantsResponse,
  ChallengeListResponse,
  ChallengeTipo,
  Modalidad,
  ContactInfo,
  Interaction,
  InteractionListResponse,
  ProfileUpdatePayload,
  Reaction,
  ReactionListResponse,
  TokenResponse,
  User,
  UserListResponse,
} from '@/types';
import { AUTH_COOKIE_NAME } from '@/lib/constants';

export { AUTH_COOKIE_NAME };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string | null;
}

const setCookie = (name: string, value: string, days = 7) => {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

async function toError(response: Response): Promise<Error> {
  const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
  const message =
    typeof error.detail === 'string'
      ? error.detail
      : Array.isArray(error.detail)
      ? error.detail.map((d: { msg?: string }) => d.msg || '').join('; ')
      : `HTTP error! status: ${response.status}`;
  return new Error(message || `HTTP error! status: ${response.status}`);
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  getToken(): string | null {
    return getCookie(AUTH_COOKIE_NAME);
  }

  setToken(token: string) {
    setCookie(AUTH_COOKIE_NAME, token);
  }

  clearToken() {
    deleteCookie(AUTH_COOKIE_NAME);
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', headers = {}, body, token } = options;

    const effectiveToken = token !== undefined ? token : this.getToken();

    const config: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
        ...headers,
      },
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (!response.ok) {
      throw await toError(response);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // ── Auth endpoints ──
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/v1/auth/login', {
      method: 'POST',
      body: { email, password },
      token: null,
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(data: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
    nit_empresa?: string;
    empresa_nombre?: string;
    programa_academico?: string;
    afiliacion_academica?: string;
  }): Promise<TokenResponse> {
    const res = await this.request<TokenResponse>('/v1/auth/register', {
      method: 'POST',
      body: data,
      token: null,
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(token?: string): Promise<User> {
    return this.request<User>('/v1/auth/users/me', {
      token: token ?? undefined,
    });
  }

  async getUserById(userId: string): Promise<User> {
    return this.request<User>(`/v1/auth/users/${userId}`);
  }

  async updateMe(payload: ProfileUpdatePayload): Promise<User> {
    return this.request<User>('/v1/auth/users/me', {
      method: 'PATCH',
      body: payload,
    });
  }

  /** Banco de hojas de vida (solo empresas y administración). */
  async searchTalent(params: {
    role?: 'solucionador' | 'egresado';
    q?: string;
    programa?: string;
    afiliacion?: string;
    con_cv?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<UserListResponse> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== false) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return this.request(`/v1/auth/users/talent${query ? `?${query}` : ''}`);
  }

  // ── Hoja de vida (PDF) ──
  async uploadMyCv(file: File): Promise<User> {
    const body = new FormData();
    body.append('file', file);
    const token = this.getToken();
    // Sin Content-Type: el navegador fija el boundary del multipart.
    const response = await fetch(`${this.baseUrl}/v1/auth/users/me/cv`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!response.ok) throw await toError(response);
    return response.json();
  }

  async deleteMyCv(): Promise<null> {
    return this.request('/v1/auth/users/me/cv', { method: 'DELETE' });
  }

  /** Descarga el CV con el token y devuelve una URL blob para <iframe> o descarga. */
  async getUserCvBlobUrl(userId: string): Promise<string> {
    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/v1/auth/users/${userId}/cv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw await toError(response);
    return URL.createObjectURL(await response.blob());
  }

  // ── Challenges endpoints ──
  async getChallenges(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    category_id?: string;
    difficulty?: string;
    featured_only?: boolean;
    tipo?: ChallengeTipo;
    author_id?: string;
  }): Promise<ChallengeListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/v1/core/challenges${query ? `?${query}` : ''}`);
  }

  async getChallenge(id: string): Promise<Challenge> {
    return this.request(`/v1/core/challenges/${id}`);
  }

  async createChallenge(data: {
    title: string;
    short_description: string;
    long_description: string;
    tipo: ChallengeTipo;
    category_id?: string;
    difficulty?: string;
    tags?: string[];
    budget?: number;
    deadline?: string;
    image_url?: string;
    modalidad?: Modalidad;
    ubicacion?: string;
  }): Promise<Challenge> {
    return this.request('/v1/core/challenges', {
      method: 'POST',
      body: data,
    });
  }

  // ── Interactions endpoints ──
  async applyToChallenge(data: { challenge_id: string; message?: string }): Promise<Interaction> {
    return this.request('/v1/match/interactions/apply', {
      method: 'POST',
      body: data,
    });
  }

  async getMyInteractions(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<InteractionListResponse> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return this.request(`/v1/match/interactions${query ? `?${query}` : ''}`);
  }

  async getChallengeApplicants(challengeId: string): Promise<ChallengeApplicantsResponse> {
    return this.request(`/v1/match/interactions/challenge/${challengeId}`);
  }

  async approveInteraction(interactionId: string, status: 'aprobado' | 'rechazado'): Promise<Interaction> {
    return this.request(`/v1/match/interactions/${interactionId}/approve`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async getInteractionContactInfo(interactionId: string): Promise<ContactInfo> {
    return this.request(`/v1/match/interactions/${interactionId}/contact`);
  }

  async getInteraction(interactionId: string): Promise<Interaction> {
    return this.request(`/v1/match/interactions/${interactionId}`);
  }

  // ── Reactions endpoints ──
  async createReaction(data: { challenge_id: string; reaction_type: 'like' | 'bookmark' }): Promise<Reaction> {
    return this.request('/v1/match/reactions', {
      method: 'POST',
      body: data,
    });
  }

  async deleteReaction(reactionId: string): Promise<null> {
    return this.request(`/v1/match/reactions/${reactionId}`, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
