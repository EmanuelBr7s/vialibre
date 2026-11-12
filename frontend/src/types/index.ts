// ── Auth Types ──

/** SOLUCIONADOR = estudiante; EGRESADO = graduado en búsqueda de empleo. */
export enum UserRole {
  ADMIN = 'admin',
  PUBLICADOR = 'publicador',
  SOLUCIONADOR = 'solucionador',
  EGRESADO = 'egresado',
}

// ── Campos con opciones fijas (el valor es el texto que se muestra) ──

/** Programas académicos de la universidad. */
export enum ProgramaAcademico {
  INGENIERIA_SISTEMAS = 'Ingeniería de Sistemas',
  INGENIERIA_INDUSTRIAL = 'Ingeniería Industrial',
  INGENIERIA_AMBIENTAL = 'Ingeniería Ambiental',
  CONTADURIA_PUBLICA = 'Contaduría Pública',
  DERECHO = 'Derecho',
  ADMINISTRACION_EMPRESAS = 'Administración de Empresas',
  OTRO = 'Otro',
}

/** Semilleros, ramas y consultorios. */
export enum AfiliacionAcademica {
  LABORATORIO_INNOVACION = 'Laboratorio de Innovación',
  RAMA_IEEE = 'Rama Estudiantil IEEE',
  CONSULTORIO_JURIDICO = 'Consultorio Jurídico',
  SEMILLERO_FINANZAS = 'Semillero de Finanzas Sostenibles',
  OTRO = 'Otro',
}

/** Semestre en curso del estudiante. */
export enum Semestre {
  PRIMERO = '1° semestre',
  SEGUNDO = '2° semestre',
  TERCERO = '3° semestre',
  CUARTO = '4° semestre',
  QUINTO = '5° semestre',
  SEXTO = '6° semestre',
  SEPTIMO = '7° semestre',
  OCTAVO = '8° semestre',
  NOVENO = '9° semestre',
  DECIMO = '10° semestre',
}

/** Municipios del Atlántico. */
export enum Ubicacion {
  BARRANQUILLA = 'Barranquilla, Atlántico',
  BARANOA = 'Baranoa, Atlántico',
  CAMPO_DE_LA_CRUZ = 'Campo de la Cruz, Atlántico',
  CANDELARIA = 'Candelaria, Atlántico',
  GALAPA = 'Galapa, Atlántico',
  JUAN_DE_ACOSTA = 'Juan de Acosta, Atlántico',
  LURUACO = 'Luruaco, Atlántico',
  MALAMBO = 'Malambo, Atlántico',
  MANATI = 'Manatí, Atlántico',
  PALMAR_DE_VARELA = 'Palmar de Varela, Atlántico',
  PIOJO = 'Piojó, Atlántico',
  POLONUEVO = 'Polonuevo, Atlántico',
  PONEDERA = 'Ponedera, Atlántico',
  PUERTO_COLOMBIA = 'Puerto Colombia, Atlántico',
  REPELON = 'Repelón, Atlántico',
  SABANAGRANDE = 'Sabanagrande, Atlántico',
  SABANALARGA = 'Sabanalarga, Atlántico',
  SANTA_LUCIA = 'Santa Lucía, Atlántico',
  SANTO_TOMAS = 'Santo Tomás, Atlántico',
  SOLEDAD = 'Soledad, Atlántico',
  SUAN = 'Suan, Atlántico',
  TUBARA = 'Tubará, Atlántico',
  USIACURI = 'Usiacurí, Atlántico',
  OTRA_CIUDAD = 'Otra ciudad',
}

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
  programa_academico?: ProgramaAcademico;
  afiliacion_academica?: AfiliacionAcademica;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  role: UserRole;
}

// ── Challenge Types (aligned with core-service schemas) ──

export enum ChallengeStatus {
  ABIERTO = 'abierto',
  EN_PROGRESO = 'en_progreso',
  CERRADO = 'cerrado',
}
export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}
/** Módulo de la publicación: reto (laboratorio), práctica o empleo. */
export enum ChallengeTipo {
  RETO = 'reto',
  PRACTICA = 'practica',
  EMPLEO = 'empleo',
}
export enum Modalidad {
  PRESENCIAL = 'presencial',
  REMOTO = 'remoto',
  HIBRIDO = 'hibrido',
}

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

export enum InteractionStatus {
  PENDIENTE = 'pendiente',
  APROBADO = 'aprobado',
  RECHAZADO = 'rechazado',
}
export enum ReactionType {
  LIKE = 'like',
  BOOKMARK = 'bookmark',
}

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

export enum DocumentoTipo {
  DOCUMENTO_IDENTIDAD = 'documento_identidad',
  CERTIFICADO_MATRICULA = 'certificado_matricula',
  AFILIACION_EPS = 'afiliacion_eps',
}

export interface DocumentInfo {
  tipo: DocumentoTipo;
  filename: string;
  size: number;
  uploaded_at: string;
}

export interface RequiredDocument {
  tipo: DocumentoTipo;
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

export enum PreferredChannel {
  CORREO = 'correo',
  TELEFONO = 'telefono',
  WHATSAPP = 'whatsapp',
}

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
  programa_academico?: ProgramaAcademico;
  afiliacion_academica?: AfiliacionAcademica;
  skills?: string[];
  soft_skills?: string[];
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  ubicacion?: Ubicacion | null;
  semestre?: Semestre | null;
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
