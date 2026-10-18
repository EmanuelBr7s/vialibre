// ── Auth Types ──

/** solucionador = estudiante; egresado = graduado en búsqueda de empleo. */
export type UserRole = 'admin' | 'publicador' | 'solucionador' | 'egresado';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  nit_empresa?: string | null;
  empresa_nombre?: string | null;
  programa_academico?: string | null;
  afiliacion_academica?: string | null;
  // Perfil profesional (estudiantes y egresados), visible para las empresas
  skills: string[];
  soft_skills: string[];
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  ubicacion?: string | null;
  semestre?: string | null;
  anio_egreso?: number | null;
  disponible: boolean;
  cv_filename?: string | null;
  cv_size?: number | null;
  cv_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  nit_empresa?: string;
  empresa_nombre?: string;
  programa_academico?: string;
  afiliacion_academica?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  role: UserRole;
}

// ── Challenge Types (aligned with core-service schemas) ──

export type ChallengeStatus = 'abierto' | 'en_progreso' | 'cerrado';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
/** Módulo de la publicación: reto (laboratorio), práctica o empleo. */
export type ChallengeTipo = 'reto' | 'practica' | 'empleo';
export type Modalidad = 'presencial' | 'remoto' | 'hibrido';

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

export interface Challenge {
  id: string;
  title: string;
  short_description: string;
  long_description: string;
  tipo: ChallengeTipo;
  author_id: string;
  category_id?: string | null;
  status: ChallengeStatus;
  difficulty?: DifficultyLevel | null;
  tags?: string[] | null;
  budget?: number | null;
  deadline?: string | null;
  image_url?: string | null;
  modalidad?: Modalidad | null;
  ubicacion?: string | null;
  is_featured: boolean;
  featured_score: number;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  empresa_nombre?: string | null;
}

export interface ChallengeListResponse {
  challenges: Challenge[];
  total: number;
  skip: number;
  limit: number;
}

// ── Match Types (aligned with match-service schemas) ──

export type InteractionStatus = 'pendiente' | 'aprobado' | 'rechazado';
export type ReactionType = 'like' | 'bookmark';

export interface Interaction {
  id: string;
  solucionador_id: string;
  challenge_id: string;
  status: InteractionStatus;
  message?: string | null;
  contact_unlocked: boolean;
  contact_unlocked_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InteractionListResponse {
  interactions: Interaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface ChallengeApplicantsResponse {
  interactions: Interaction[];
  total: number;
}

export interface Reaction {
  id: string;
  user_id: string;
  challenge_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface ReactionListResponse {
  reactions: Reaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface ContactInfo {
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  empresa_nombre?: string | null;
  programa_academico?: string | null;
  afiliacion_academica?: string | null;
}

// ── Documentos de práctica (carta de aval) ──

export interface DocumentInfo {
  tipo: string;
  filename: string;
  size: number;
  uploaded_at: string;
}

export interface RequiredDocument {
  tipo: string;
  label: string;
  documento?: DocumentInfo | null;
}

export interface DocumentChecklist {
  /** Práctica en la que el estudiante fue seleccionado. */
  aplica: boolean;
  completos: boolean;
  requeridos: RequiredDocument[];
}

// ── Profile / Resume types (client-persisted extended data) ──

export type PreferredChannel = 'correo' | 'telefono' | 'whatsapp';

export interface ExtendedProfile {
  /** Campos que el backend aún no persiste; se guardan en el navegador. */
  second_email?: string;
  cargo?: string;
  departamento?: string;
  enlaces_corporativos: string[];
  canal_preferido: PreferredChannel;
}

export interface ResumeInfo {
  id: string;
  fileName: string;
  size: number;
  updatedAt: string;
}

export type ResumeStatus = 'activo';

export interface ProfileUpdatePayload {
  full_name?: string;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  empresa_nombre?: string;
  programa_academico?: string;
  afiliacion_academica?: string;
  skills?: string[];
  soft_skills?: string[];
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  ubicacion?: string | null;
  semestre?: string | null;
  anio_egreso?: number | null;
  disponible?: boolean;
}

// ── Admin CRUD Types ──

export interface TutorDocente {
  id: string;
  identificacion: string | null;
  nombres: string | null;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  programa_academico: string | null;
  user_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorDocenteCreate {
  identificacion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  programa_academico?: string | null;
  user_id?: string | null;
  activo?: boolean;
}

export interface TutorDocenteUpdate {
  identificacion?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  telefono?: string | null;
  programa_academico?: string | null;
  user_id?: string | null;
  activo?: boolean | null;
}

export interface TutorDocenteListResponse {
  tutores: TutorDocente[];
  total: number;
  skip: number;
  limit: number;
}

export interface Empresa {
  id: string;
  nit: string | null;
  razon_social: string | null;
  sector: string | null;
  representante_legal: string | null;
  contacto_email: string | null;
  contacto_telefono: string | null;
  publicador_user_id: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmpresaCreate {
  nit?: string | null;
  razon_social?: string | null;
  sector?: string | null;
  representante_legal?: string | null;
  contacto_email?: string | null;
  contacto_telefono?: string | null;
  publicador_user_id?: string | null;
  activa?: boolean;
}

export interface EmpresaUpdate {
  nit?: string | null;
  razon_social?: string | null;
  sector?: string | null;
  representante_legal?: string | null;
  contacto_email?: string | null;
  contacto_telefono?: string | null;
  publicador_user_id?: string | null;
  activa?: boolean | null;
}

export interface EmpresaListResponse {
  empresas: Empresa[];
  total: number;
  skip: number;
  limit: number;
}

export interface Practica {
  id: string;
  challenge_id: string | null;
  interaction_id: string;
  solucionador_id: string | null;
  empresa_id: string | null;
  tutor_docente_id: string | null;
  created_by: string | null;
  estado_administrativo: string | null;
  modalidad: string | null;
  tipo_practica: string | null;
  duracion_horas: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  anio_academico: string | null;
  periodo_academico: string | null;
  bilingue: boolean;
  observaciones_institucionales: string | null;
  fecha_formalizacion: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticaCreate {
  interaction_id: string;
  challenge_id?: string | null;
  solucionador_id?: string | null;
  empresa_id?: string | null;
  tutor_docente_id?: string | null;
  estado_administrativo?: string | null;
  modalidad?: string | null;
  tipo_practica?: string | null;
  duracion_horas?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  anio_academico?: string | null;
  periodo_academico?: string | null;
  bilingue?: boolean;
  observaciones_institucionales?: string | null;
}

export interface PracticaUpdate {
  empresa_id?: string | null;
  tutor_docente_id?: string | null;
  estado_administrativo?: string | null;
  modalidad?: string | null;
  tipo_practica?: string | null;
  duracion_horas?: number | null;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  anio_academico?: string | null;
  periodo_academico?: string | null;
  bilingue?: boolean | null;
  observaciones_institucionales?: string | null;
}

export interface PracticaListResponse {
  practicas: Practica[];
  total: number;
  skip: number;
  limit: number;
}
