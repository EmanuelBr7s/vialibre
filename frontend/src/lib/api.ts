import type {
  Challenge,
  ChallengeApplicantsResponse,
  ChallengeListResponse,
  ContactInfo,
  DocumentChecklist,
  DocumentInfo,
  Empresa,
  EmpresaCreate,
  EmpresaListResponse,
  EmpresaUpdate,
  Interaction,
  InteractionListResponse,
  Practica,
  PracticaCreate,
  PracticaListResponse,
  PracticaUpdate,
  ProfileUpdatePayload,
  Reaction,
  ReactionListResponse,
  TokenResponse,
  TutorDocente,
  TutorDocenteCreate,
  TutorDocenteListResponse,
  TutorDocenteUpdate,
  User,
  UserListResponse,
} from '@/types';
import { ChallengeTipo, InteractionStatus, Modalidad, ReactionType, UserRole } from '@/types';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import { mockApi } from '@/lib/mockApi';
import { NETWORK_ERROR_MESSAGE, messageForResponse } from '@/lib/apiMessages';

export { AUTH_COOKIE_NAME };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// Modo mockup autocontenido: responde con datos locales (src/lib/mockApi.ts)
// en lugar de llamar a la infraestructura real (auth/core/match vía el proxy de Next.js).
const MOCK_MODE = process.env.NEXT_PUBLIC_API_MOCK === 'true';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string | null;
}

/**
 * Error HTTP con el código de estado, para que la UI distinga
 * 401 (sesión), 403 (permisos), 409 (conflicto) y 422 (validación).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
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

/** Convierte una respuesta de error en un ApiError con mensaje en español. */
async function toError(response: Response): Promise<ApiError> {
  const bodyText = await response.text().catch(() => '');
  return new ApiError(messageForResponse(response.status, bodyText), response.status);
}

/**
 * Reintentos de lecturas (GET) cuando el servidor está arrancando (502/503/504)
 * o no hay respuesta. El plan gratuito de Render suspende el servicio tras un
 * rato sin uso, y la primera petición puede fallar mientras despierta.
 * Las escrituras nunca se reintentan: podrían duplicar la operación.
 */
export const apiRetry = { delaysMs: [1000, 3000] };
const RETRYABLE_STATUS = new Set([502, 503, 504]);

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** fetch que convierte los fallos de red en ApiError (status 0) y reintenta los GET. */
async function fetchWithRetry(url: string, config: RequestInit): Promise<Response> {
  const method = (config.method ?? 'GET').toUpperCase();
  const delays = method === 'GET' ? apiRetry.delaysMs : [];
  for (let attempt = 0; ; attempt += 1) {
    const canRetry = attempt < delays.length;
    try {
      const response = await fetch(url, config);
      if (!RETRYABLE_STATUS.has(response.status) || !canRetry) return response;
    } catch {
      if (!canRetry) throw new ApiError(NETWORK_ERROR_MESSAGE, 0);
    }
    await wait(delays[attempt]);
  }
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

    const response = await fetchWithRetry(`${this.baseUrl}${endpoint}`, config);

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
    if (MOCK_MODE) {
      const res = await mockApi.login(email);
      this.setToken(res.access_token);
      return res;
    }
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
    if (MOCK_MODE) {
      const res = await mockApi.register(data);
      this.setToken(res.access_token);
      return res;
    }
    const res = await this.request<TokenResponse>('/v1/auth/register', {
      method: 'POST',
      body: data,
      token: null,
    });
    this.setToken(res.access_token);
    return res;
  }

  async getMe(token?: string): Promise<User> {
    if (MOCK_MODE) {
      return mockApi.getMe(token ?? this.getToken() ?? undefined);
    }
    return this.request<User>('/v1/auth/users/me', {
      token: token ?? undefined,
    });
  }

  async getUserById(userId: string): Promise<User> {
    if (MOCK_MODE) return mockApi.getUserById(userId);
    return this.request<User>(`/v1/auth/users/${userId}`);
  }

  async updateMe(payload: ProfileUpdatePayload): Promise<User> {
    if (MOCK_MODE) return mockApi.updateMe(payload);
    return this.request<User>('/v1/auth/users/me', {
      method: 'PATCH',
      body: payload,
    });
  }

  /** Banco de hojas de vida (solo empresas y administración). */
  async searchTalent(params: {
    role?: UserRole.SOLUCIONADOR | UserRole.EGRESADO;
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

  // ── Archivos (multipart y descargas autenticadas) ──
  private async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const body = new FormData();
    body.append('file', file);
    const token = this.getToken();
    // Sin Content-Type: el navegador fija el boundary del multipart.
    const response = await fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    if (!response.ok) throw await toError(response);
    return response.json();
  }

  /** Descarga con el token y devuelve una URL blob para <iframe> o descarga. */
  private async fetchBlobUrl(endpoint: string): Promise<string> {
    const token = this.getToken();
    const response = await fetchWithRetry(`${this.baseUrl}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw await toError(response);
    return URL.createObjectURL(await response.blob());
  }

  // ── Hoja de vida (PDF) ──
  async uploadMyCv(file: File): Promise<User> {
    return this.uploadFile('/v1/auth/users/me/cv', file);
  }

  async deleteMyCv(): Promise<null> {
    return this.request('/v1/auth/users/me/cv', { method: 'DELETE' });
  }

  async getUserCvBlobUrl(userId: string): Promise<string> {
    return this.fetchBlobUrl(`/v1/auth/users/${userId}/cv`);
  }

  // ── Documentos de práctica y carta de aval ──
  async getPracticeDocuments(interactionId: string): Promise<DocumentChecklist> {
    return this.request(`/v1/match/interactions/${interactionId}/documentos`);
  }

  async uploadPracticeDocument(interactionId: string, tipo: string, file: File): Promise<DocumentInfo> {
    return this.uploadFile(`/v1/match/interactions/${interactionId}/documentos/${tipo}`, file);
  }

  async getPracticeDocumentBlobUrl(interactionId: string, tipo: string): Promise<string> {
    return this.fetchBlobUrl(`/v1/match/interactions/${interactionId}/documentos/${tipo}`);
  }

  async getEndorsementLetterBlobUrl(interactionId: string): Promise<string> {
    return this.fetchBlobUrl(`/v1/match/interactions/${interactionId}/carta-aval`);
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
    if (MOCK_MODE) return mockApi.getChallenges(params);
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
    if (MOCK_MODE) return mockApi.getChallenge(id);
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
    if (MOCK_MODE) return mockApi.createChallenge(data);
    return this.request('/v1/core/challenges', {
      method: 'POST',
      body: data,
    });
  }

  // ── Interactions endpoints ──
  async applyToChallenge(data: { challenge_id: string; message?: string }): Promise<Interaction> {
    if (MOCK_MODE) return mockApi.applyToChallenge(data);
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
    if (MOCK_MODE) return mockApi.getMyInteractions(params);
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
    if (MOCK_MODE) return mockApi.getChallengeApplicants(challengeId);
    return this.request(`/v1/match/interactions/challenge/${challengeId}`);
  }

  async approveInteraction(interactionId: string, status: InteractionStatus.APROBADO | InteractionStatus.RECHAZADO): Promise<Interaction> {
    if (MOCK_MODE) return mockApi.approveInteraction(interactionId, status);
    return this.request(`/v1/match/interactions/${interactionId}/approve`, {
      method: 'PATCH',
      body: { status },
    });
  }

  async getInteractionContactInfo(interactionId: string): Promise<ContactInfo> {
    if (MOCK_MODE) return mockApi.getInteractionContactInfo(interactionId);
    return this.request(`/v1/match/interactions/${interactionId}/contact`);
  }

  async getInteraction(interactionId: string): Promise<Interaction> {
    if (MOCK_MODE) return mockApi.getInteraction(interactionId);
    return this.request(`/v1/match/interactions/${interactionId}`);
  }

  // ── Reactions endpoints ──
  async createReaction(data: { challenge_id: string; reaction_type: ReactionType }): Promise<Reaction> {
    if (MOCK_MODE) return mockApi.createReaction(data);
    return this.request('/v1/match/reactions', {
      method: 'POST',
      body: data,
    });
  }

  async deleteReaction(reactionId: string): Promise<null> {
    if (MOCK_MODE) return mockApi.deleteReaction(reactionId);
    return this.request(`/v1/match/reactions/${reactionId}`, { method: 'DELETE' });
  }

  // ── Admin: Tutores docentes (auth-service) ──
  async listTutoresDocentes(params?: {
    activo?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<TutorDocenteListResponse> {
    if (MOCK_MODE) return mockApi.listTutoresDocentes(params);
    return this.request(
      `/v1/auth/tutores-docentes${this.buildQuery(params ?? {})}`
    );
  }

  async getTutorDocente(tutorId: string): Promise<TutorDocente> {
    if (MOCK_MODE) return mockApi.getTutorDocente(tutorId);
    return this.request(`/v1/auth/tutores-docentes/${tutorId}`);
  }

  async createTutorDocente(data: TutorDocenteCreate): Promise<TutorDocente> {
    if (MOCK_MODE) return mockApi.createTutorDocente(data);
    return this.request('/v1/auth/tutores-docentes', {
      method: 'POST',
      body: data,
    });
  }

  async updateTutorDocente(
    tutorId: string,
    data: TutorDocenteUpdate
  ): Promise<TutorDocente> {
    if (MOCK_MODE) return mockApi.updateTutorDocente(tutorId, data);
    return this.request(`/v1/auth/tutores-docentes/${tutorId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // ── Admin: Empresas (core-service) ──
  async listEmpresas(params?: {
    activa?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<EmpresaListResponse> {
    if (MOCK_MODE) return mockApi.listEmpresas(params);
    return this.request(`/v1/core/empresas${this.buildQuery(params ?? {})}`);
  }

  async getEmpresa(empresaId: string): Promise<Empresa> {
    if (MOCK_MODE) return mockApi.getEmpresa(empresaId);
    return this.request(`/v1/core/empresas/${empresaId}`);
  }

  async createEmpresa(data: EmpresaCreate): Promise<Empresa> {
    if (MOCK_MODE) return mockApi.createEmpresa(data);
    return this.request('/v1/core/empresas', {
      method: 'POST',
      body: data,
    });
  }

  async updateEmpresa(
    empresaId: string,
    data: EmpresaUpdate
  ): Promise<Empresa> {
    if (MOCK_MODE) return mockApi.updateEmpresa(empresaId, data);
    return this.request(`/v1/core/empresas/${empresaId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  // ── Admin: Prácticas formalizadas (match-service) ──
  async listPracticas(params?: {
    estado?: string;
    skip?: number;
    limit?: number;
  }): Promise<PracticaListResponse> {
    if (MOCK_MODE) return mockApi.listPracticas(params);
    return this.request(
      `/v1/match/practicas${this.buildQuery(params ?? {})}`
    );
  }

  async getPractica(practicaId: string): Promise<Practica> {
    if (MOCK_MODE) return mockApi.getPractica(practicaId);
    return this.request(`/v1/match/practicas/${practicaId}`);
  }

  /** Formaliza una práctica (requiere interaction_id; 409 si ya existe). */
  async createPractica(data: PracticaCreate): Promise<Practica> {
    if (MOCK_MODE) return mockApi.createPractica(data);
    return this.request('/v1/match/practicas', {
      method: 'POST',
      body: data,
    });
  }

  async updatePractica(
    practicaId: string,
    data: PracticaUpdate
  ): Promise<Practica> {
    if (MOCK_MODE) return mockApi.updatePractica(practicaId, data);
    return this.request(`/v1/match/practicas/${practicaId}`, {
      method: 'PATCH',
      body: data,
    });
  }

  /** Construye la query string omitiendo los valores no definidos. */
  private buildQuery(
    params: Record<string, string | number | boolean | undefined>
  ): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return query ? `?${query}` : '';
  }
}

export const api = new ApiClient();
export default api;
