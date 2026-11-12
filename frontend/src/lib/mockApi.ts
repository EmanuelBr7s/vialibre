// ── Cliente API en modo mock (NEXT_PUBLIC_API_MOCK=true) ──
// Replica el comportamiento del ApiClient real con datos locales persistentes
// en localStorage, de modo que el frontend funcione de extremo a extremo como
// mockup sin depender de la infraestructura (auth/core/match).

import type {
  Challenge,
  ChallengeApplicantsResponse,
  ChallengeListResponse,
  ContactInfo,
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
} from '@/types';
import {
  ChallengeStatus,
  ChallengeTipo,
  DifficultyLevel,
  InteractionStatus,
  Modalidad,
  ReactionType,
  UserRole,
} from '@/types';
import { AUTH_COOKIE_NAME, isTalentRole } from '@/lib/constants';
// Import circular con api.ts: ApiError solo se usa al llamar a un método, nunca al cargar el módulo.
import { ApiError } from '@/lib/api';
import {
  MOCK_CHALLENGES,
  MOCK_EMPRESAS,
  MOCK_INTERACTIONS,
  MOCK_PRACTICAS,
  MOCK_TUTORES,
  MOCK_USERS,
} from '@/data/mock';

const MOCK_DB_KEY = 'vialibre_mock_db_v1';
const MOCK_DB_VERSION = 3;

interface MockDb {
  version: number;
  users: User[];
  challenges: Challenge[];
  interactions: Interaction[];
  reactions: Reaction[];
  tutores: TutorDocente[];
  empresas: Empresa[];
  practicas: Practica[];
}

const now = (): string => new Date().toISOString();

const uid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

const encodeEmail = (email: string): string =>
  `mock.${btoa(encodeURIComponent(email.trim().toLowerCase()))}`;

const decodeEmail = (token: string): string | null => {
  try {
    const raw = token.startsWith('mock.') ? token.slice(5) : '';
    if (!raw) return null;
    return decodeURIComponent(atob(raw)).toLowerCase();
  } catch {
    return null;
  }
};

function seedDb(): MockDb {
  return {
    version: MOCK_DB_VERSION,
    users: MOCK_USERS.map((u) => ({ ...u })),
    challenges: MOCK_CHALLENGES.map((c) => ({ ...c })),
    interactions: MOCK_INTERACTIONS.map((i) => ({ ...i })),
    reactions: [],
    tutores: MOCK_TUTORES.map((x) => ({ ...x })),
    empresas: MOCK_EMPRESAS.map((x) => ({ ...x })),
    practicas: MOCK_PRACTICAS.map((x) => ({ ...x })),
  };
}

/**
 * PATCH parcial: ignora claves ausentes y no pisa con `null` los campos
 * booleanos obligatorios (activo/activa/bilingue).
 */
function applyPatch<T extends object>(target: T, patch: object) {
  const record = target as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (value === null && typeof record[key] === 'boolean') continue;
    record[key] = value;
  }
}

function persist(db: MockDb) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
  } catch {
    // quota exceeded o storage deshabilitado: la sesión seguirá funcionando en memoria.
  }
}

function loadDb(): MockDb {
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(MOCK_DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MockDb;
        if (
          parsed &&
          parsed.version === MOCK_DB_VERSION &&
          Array.isArray(parsed.users) &&
          Array.isArray(parsed.challenges) &&
          Array.isArray(parsed.interactions) &&
          Array.isArray(parsed.tutores) &&
          Array.isArray(parsed.empresas) &&
          Array.isArray(parsed.practicas)
        ) {
          return parsed;
        }
      }
    } catch {
      // JSON corrupto: se reseeda.
    }
  }
  const fresh = seedDb();
  persist(fresh);
  return fresh;
}

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function currentUser(db: MockDb): User {
  const token = readCookie(AUTH_COOKIE_NAME);
  if (!token) throw new Error('No hay sesión activa.');
  const email = decodeEmail(token);
  const user = email ? db.users.find((u) => u.email.toLowerCase() === email) : undefined;
  if (!user) throw new Error('Sesión no válida.');
  return user;
}

const sleep = (ms = 140) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function tokenResponse(user: User): TokenResponse {
  return {
    access_token: encodeEmail(user.email),
    token_type: 'bearer',
    expires_in: 604800,
    user_id: user.id,
    role: user.role,
  };
}

const challengeForInteraction = (db: MockDb, interaction: Interaction): Challenge | undefined =>
  db.challenges.find((c) => c.id === interaction.challenge_id);

export class MockApiClient {
  // ── Auth ──
  async login(email: string): Promise<TokenResponse> {
    const db = loadDb();
    const key = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === key);
    if (!user) {
      await sleep(200);
      throw new Error('Credenciales inválidas.');
    }
    if (!user.is_active) {
      await sleep(200);
      throw new Error('El usuario está inactivo.');
    }
    await sleep();
    return tokenResponse(user);
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
    const db = loadDb();
    const key = data.email.trim().toLowerCase();
    if (db.users.some((u) => u.email.toLowerCase() === key)) {
      await sleep(200);
      throw new Error('El correo ya está registrado.');
    }
    const role: UserRole =
      data.role === UserRole.PUBLICADOR
        ? UserRole.PUBLICADOR
        : data.role === UserRole.EGRESADO
          ? UserRole.EGRESADO
          : UserRole.SOLUCIONADOR;
    const user: User = {
      id: uid(),
      email: key,
      full_name: data.full_name,
      role,
      is_active: true,
      phone: data.phone || null,
      nit_empresa: data.nit_empresa || null,
      empresa_nombre: data.empresa_nombre || null,
      programa_academico: data.programa_academico || null,
      afiliacion_academica: data.afiliacion_academica || null,
      avatar_url: null,
      bio: null,
      skills: [],
      soft_skills: [],
      disponible: true,
      created_at: now(),
      updated_at: now(),
    };
    db.users.push(user);
    persist(db);
    await sleep();
    return tokenResponse(user);
  }

  async getMe(token?: string): Promise<User> {
    const db = loadDb();
    const t = token ?? readCookie(AUTH_COOKIE_NAME);
    if (!t) throw new Error('No hay sesión activa.');
    const email = decodeEmail(t);
    const user = email ? db.users.find((u) => u.email.toLowerCase() === email) : undefined;
    if (!user) throw new Error('Sesión no válida.');
    await sleep();
    return clone(user);
  }

  async getUserById(userId: string): Promise<User> {
    const db = loadDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new Error('Usuario no encontrado.');
    await sleep();
    return clone(user);
  }

  async updateMe(payload: ProfileUpdatePayload): Promise<User> {
    const db = loadDb();
    const user = currentUser(db);
    for (const key of [
      'full_name',
      'phone',
      'bio',
      'avatar_url',
      'empresa_nombre',
      'programa_academico',
      'afiliacion_academica',
      'skills',
      'soft_skills',
      'linkedin_url',
      'github_url',
      'portfolio_url',
      'ubicacion',
      'semestre',
      'anio_egreso',
      'disponible',
    ] as const) {
      if (payload[key] !== undefined) {
        (user as unknown as Record<string, unknown>)[key] = payload[key];
      }
    }
    user.updated_at = now();
    persist(db);
    await sleep();
    return clone(user);
  }

  // ── Challenges ──
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
    const db = loadDb();
    await sleep();
    const filtered = [...db.challenges]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((c) => {
        if (params?.status && c.status !== params.status) return false;
        if (params?.category_id && c.category_id !== params.category_id) return false;
        if (params?.difficulty && c.difficulty !== params.difficulty) return false;
        if (params?.featured_only && !c.is_featured) return false;
        if (params?.tipo && c.tipo !== params.tipo) return false;
        if (params?.author_id && String(c.author_id) !== String(params.author_id)) return false;
        return true;
      });
    const total = filtered.length;
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? total;
    return {
      challenges: filtered.slice(skip, skip + limit).map(clone<Challenge>),
      total,
      skip,
      limit,
    };
  }

  async getChallenge(id: string): Promise<Challenge> {
    const db = loadDb();
    const challenge = db.challenges.find((c) => c.id === id);
    if (!challenge) {
      await sleep(200);
      throw new Error('Problemática no encontrada.');
    }
    await sleep();
    return clone(challenge);
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
    const db = loadDb();
    const user = currentUser(db);
    if (user.role !== UserRole.PUBLICADOR && user.role !== UserRole.ADMIN) {
      throw new Error('Solo el publicador puede crear problemáticas.');
    }
    if (!db.challenges.some((c) => c.title.toLowerCase() === data.title.trim().toLowerCase())) {
      const challenge: Challenge = {
        id: uid(),
        title: data.title,
        short_description: data.short_description,
        long_description: data.long_description,
        tipo: data.tipo,
        author_id: user.id,
        category_id: data.category_id || null,
        status: ChallengeStatus.ABIERTO,
        difficulty: (data.difficulty as DifficultyLevel | undefined) || DifficultyLevel.MEDIUM,
        tags: data.tags || [],
        budget: data.budget ?? null,
        deadline: data.deadline || null,
        image_url: data.image_url || null,
        modalidad: data.modalidad ?? null,
        ubicacion: data.ubicacion || null,
        is_featured: false,
        featured_score: 0,
        created_at: now(),
        updated_at: now(),
        author_name: user.full_name,
        empresa_nombre: user.empresa_nombre || user.full_name,
      };
      db.challenges.unshift(challenge);
      persist(db);
      await sleep();
      return clone(challenge);
    }
    await sleep(200);
    throw new Error('Ya existe una problemática con ese título.');
  }

  // ── Interactions ──
  async applyToChallenge(data: { challenge_id: string; message?: string }): Promise<Interaction> {
    const db = loadDb();
    const user = currentUser(db);
    if (!isTalentRole(user.role)) {
      throw new Error('Solo los solucionadores pueden postularse a problemáticas.');
    }
    const challenge = db.challenges.find((c) => c.id === data.challenge_id);
    if (!challenge) {
      throw new Error('Problemática no encontrada.');
    }
    if (challenge.status === ChallengeStatus.CERRADO) {
      throw new Error('Esta problemática está cerrada y ya no acepta postulaciones.');
    }
    if (db.interactions.some((i) => i.solucionador_id === user.id && i.challenge_id === data.challenge_id)) {
      throw new Error('Ya te postulaste a esta problemática.');
    }
    const interaction: Interaction = {
      id: uid(),
      solucionador_id: user.id,
      challenge_id: data.challenge_id,
      status: InteractionStatus.PENDIENTE,
      message: data.message || null,
      contact_unlocked: false,
      created_at: now(),
      updated_at: now(),
    };
    db.interactions.unshift(interaction);
    persist(db);
    await sleep();
    return clone(interaction);
  }

  async getMyInteractions(params?: {
    skip?: number;
    limit?: number;
    status?: string;
  }): Promise<InteractionListResponse> {
    const db = loadDb();
    const user = currentUser(db);
    await sleep();
    const filtered = db.interactions
      .filter((i) => i.solucionador_id === user.id)
      .filter((i) => (params?.status ? i.status === params.status : true))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const total = filtered.length;
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? total;
    return {
      interactions: filtered.slice(skip, skip + limit).map(clone<Interaction>),
      total,
      skip,
      limit,
    };
  }

  async getChallengeApplicants(challengeId: string): Promise<ChallengeApplicantsResponse> {
    const db = loadDb();
    await sleep();
    const interactions = db.interactions
      .filter((i) => i.challenge_id === challengeId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return {
      interactions: interactions.map(clone<Interaction>),
      total: interactions.length,
    };
  }

  async approveInteraction(
    interactionId: string,
    status: InteractionStatus.APROBADO | InteractionStatus.RECHAZADO
  ): Promise<Interaction> {
    const db = loadDb();
    const interaction = db.interactions.find((i) => i.id === interactionId);
    if (!interaction) throw new Error('Interacción no encontrada.');
    interaction.status = status;
    interaction.updated_at = now();
    if (status === InteractionStatus.APROBADO) {
      interaction.contact_unlocked = true;
      interaction.contact_unlocked_at = now();
    }
    persist(db);
    await sleep();
    return clone(interaction);
  }

  async getInteraction(interactionId: string): Promise<Interaction> {
    const db = loadDb();
    const interaction = db.interactions.find((i) => i.id === interactionId);
    if (!interaction) throw new Error('Interacción no encontrada.');
    await sleep();
    return clone(interaction);
  }

  async getInteractionContactInfo(interactionId: string): Promise<ContactInfo> {
    const db = loadDb();
    const interaction = db.interactions.find((i) => i.id === interactionId);
    if (!interaction) throw new Error('Interacción no encontrada.');
    const user = currentUser(db);
    if (!interaction.contact_unlocked) {
      throw new Error('El contacto se desbloquea cuando el publicador aprueba la postulación.');
    }
    await sleep();

    // El solucionador ve el contacto del publicador; el publicador ve el del solucionador.
    const otherUserId =
      user.id === interaction.solucionador_id
        ? challengeForInteraction(db, interaction)?.author_id
        : interaction.solucionador_id;

    const other = otherUserId ? db.users.find((u) => u.id === otherUserId) : undefined;
    if (!other) throw new Error('Contacto no disponible.');

    return {
      user_id: other.id,
      full_name: other.full_name,
      email: other.email,
      phone: other.phone || null,
      empresa_nombre: other.empresa_nombre || null,
      programa_academico: other.programa_academico || null,
      afiliacion_academica: other.afiliacion_academica || null,
    };
  }

  // ── Reactions ──
  async createReaction(data: {
    challenge_id: string;
    reaction_type: ReactionType;
  }): Promise<Reaction> {
    const db = loadDb();
    const user = currentUser(db);
    db.reactions = db.reactions.filter(
      (r) =>
        !(r.user_id === user.id && r.challenge_id === data.challenge_id && r.reaction_type === data.reaction_type)
    );
    const reaction: Reaction = {
      id: uid(),
      user_id: user.id,
      challenge_id: data.challenge_id,
      reaction_type: data.reaction_type,
      created_at: now(),
    };
    db.reactions.push(reaction);
    persist(db);
    await sleep();
    return clone(reaction);
  }

  async deleteReaction(reactionId: string): Promise<null> {
    const db = loadDb();
    db.reactions = db.reactions.filter((r) => r.id !== reactionId);
    persist(db);
    await sleep();
    return null;
  }

  // ── Admin: helpers ──
  private requireAdmin(db: MockDb): User {
    const user = currentUser(db);
    if (user.role !== UserRole.ADMIN) {
      throw new ApiError('Operación exclusiva del rol admin', 403);
    }
    return user;
  }

  private page<T>(items: T[], params?: { skip?: number; limit?: number }) {
    const skip = params?.skip ?? 0;
    const limit = params?.limit ?? 20;
    return { items: items.slice(skip, skip + limit).map(clone<T>), total: items.length, skip, limit };
  }

  // ── Admin: Tutores docentes ──
  async listTutoresDocentes(params?: {
    activo?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<TutorDocenteListResponse> {
    const db = loadDb();
    this.requireAdmin(db);
    await sleep();
    const filtered = db.tutores
      .filter((t) => params?.activo === undefined || t.activo === params.activo)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { items, total, skip, limit } = this.page(filtered, params);
    return { tutores: items, total, skip, limit };
  }

  async getTutorDocente(tutorId: string): Promise<TutorDocente> {
    const db = loadDb();
    this.requireAdmin(db);
    const tutor = db.tutores.find((t) => t.id === tutorId);
    await sleep();
    if (!tutor) throw new ApiError('Tutor docente no encontrado', 404);
    return clone(tutor);
  }

  async createTutorDocente(data: TutorDocenteCreate): Promise<TutorDocente> {
    const db = loadDb();
    this.requireAdmin(db);
    const tutor: TutorDocente = {
      id: uid(),
      identificacion: data.identificacion ?? null,
      nombres: data.nombres ?? null,
      apellidos: data.apellidos ?? null,
      email: data.email ?? null,
      telefono: data.telefono ?? null,
      programa_academico: data.programa_academico ?? null,
      user_id: data.user_id ?? null,
      activo: data.activo ?? true,
      created_at: now(),
      updated_at: now(),
    };
    db.tutores.unshift(tutor);
    persist(db);
    await sleep();
    return clone(tutor);
  }

  async updateTutorDocente(tutorId: string, data: TutorDocenteUpdate): Promise<TutorDocente> {
    const db = loadDb();
    this.requireAdmin(db);
    const tutor = db.tutores.find((t) => t.id === tutorId);
    if (!tutor) throw new ApiError('Tutor docente no encontrado', 404);
    applyPatch(tutor, data);
    tutor.updated_at = now();
    persist(db);
    await sleep();
    return clone(tutor);
  }

  // ── Admin: Empresas ──
  async listEmpresas(params?: { activa?: boolean; skip?: number; limit?: number }): Promise<EmpresaListResponse> {
    const db = loadDb();
    this.requireAdmin(db);
    await sleep();
    const filtered = db.empresas
      .filter((e) => params?.activa === undefined || e.activa === params.activa)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { items, total, skip, limit } = this.page(filtered, params);
    return { empresas: items, total, skip, limit };
  }

  async getEmpresa(empresaId: string): Promise<Empresa> {
    const db = loadDb();
    this.requireAdmin(db);
    const empresa = db.empresas.find((e) => e.id === empresaId);
    await sleep();
    if (!empresa) throw new ApiError('Empresa no encontrada', 404);
    return clone(empresa);
  }

  async createEmpresa(data: EmpresaCreate): Promise<Empresa> {
    const db = loadDb();
    this.requireAdmin(db);
    const empresa: Empresa = {
      id: uid(),
      nit: data.nit ?? null,
      razon_social: data.razon_social ?? null,
      sector: data.sector ?? null,
      representante_legal: data.representante_legal ?? null,
      contacto_email: data.contacto_email ?? null,
      contacto_telefono: data.contacto_telefono ?? null,
      publicador_user_id: data.publicador_user_id ?? null,
      activa: data.activa ?? true,
      created_at: now(),
      updated_at: now(),
    };
    db.empresas.unshift(empresa);
    persist(db);
    await sleep();
    return clone(empresa);
  }

  async updateEmpresa(empresaId: string, data: EmpresaUpdate): Promise<Empresa> {
    const db = loadDb();
    this.requireAdmin(db);
    const empresa = db.empresas.find((e) => e.id === empresaId);
    if (!empresa) throw new ApiError('Empresa no encontrada', 404);
    applyPatch(empresa, data);
    empresa.updated_at = now();
    persist(db);
    await sleep();
    return clone(empresa);
  }

  // ── Admin: Prácticas formalizadas ──
  async listPracticas(params?: { estado?: string; skip?: number; limit?: number }): Promise<PracticaListResponse> {
    const db = loadDb();
    this.requireAdmin(db);
    await sleep();
    const estado = params?.estado?.trim().toLowerCase();
    const filtered = db.practicas
      .filter((p) => !estado || (p.estado_administrativo ?? '').toLowerCase() === estado)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    const { items, total, skip, limit } = this.page(filtered, params);
    return { practicas: items, total, skip, limit };
  }

  async getPractica(practicaId: string): Promise<Practica> {
    const db = loadDb();
    this.requireAdmin(db);
    const practica = db.practicas.find((p) => p.id === practicaId);
    await sleep();
    if (!practica) throw new ApiError('Práctica no encontrada', 404);
    return clone(practica);
  }

  async createPractica(data: PracticaCreate): Promise<Practica> {
    const db = loadDb();
    const admin = this.requireAdmin(db);
    const interaction = db.interactions.find((i) => i.id === data.interaction_id);
    if (!interaction) throw new ApiError('Interacción no encontrada', 404);
    if (db.practicas.some((p) => p.interaction_id === data.interaction_id)) {
      throw new ApiError('Ya existe una practica formalizada para esta interaccion', 409);
    }
    const practica: Practica = {
      id: uid(),
      interaction_id: data.interaction_id,
      challenge_id: data.challenge_id ?? interaction.challenge_id,
      solucionador_id: data.solucionador_id ?? interaction.solucionador_id,
      empresa_id: data.empresa_id ?? null,
      tutor_docente_id: data.tutor_docente_id ?? null,
      created_by: admin.id,
      estado_administrativo: data.estado_administrativo ?? null,
      modalidad: data.modalidad ?? null,
      tipo_practica: data.tipo_practica ?? null,
      duracion_horas: data.duracion_horas ?? null,
      fecha_inicio: data.fecha_inicio ?? null,
      fecha_fin: data.fecha_fin ?? null,
      anio_academico: data.anio_academico ?? null,
      periodo_academico: data.periodo_academico ?? null,
      bilingue: data.bilingue ?? false,
      observaciones_institucionales: data.observaciones_institucionales ?? null,
      fecha_formalizacion: now(),
      created_at: now(),
      updated_at: now(),
    };
    db.practicas.unshift(practica);
    persist(db);
    await sleep();
    return clone(practica);
  }

  async updatePractica(practicaId: string, data: PracticaUpdate): Promise<Practica> {
    const db = loadDb();
    this.requireAdmin(db);
    const practica = db.practicas.find((p) => p.id === practicaId);
    if (!practica) throw new ApiError('Práctica no encontrada', 404);
    applyPatch(practica, data);
    practica.updated_at = now();
    persist(db);
    await sleep();
    return clone(practica);
  }
}

export const mockApi = new MockApiClient();