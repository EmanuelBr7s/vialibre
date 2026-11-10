// ── Datos mock contextualizados ──
// Vistas funcionales de demostración para los módulos del menú de usuario.
// La información real se obtiene de la API cuando existe; aquí se usan datos
// realistas cuando la API no cubre el flujo (problemáticas de la org, KPIs admin,
// perfiles editables, etc.).

import { ChallengeStatus, InteractionStatus, UserRole } from '@/types';

export type OrgChallengeStatus = ChallengeStatus;

export const CHALLENGE_STATUS_LABEL: Record<OrgChallengeStatus, string> = {
  [ChallengeStatus.ABIERTO]: 'Abierta',
  [ChallengeStatus.EN_PROGRESO]: 'En Progreso',
  [ChallengeStatus.CERRADO]: 'Cerrada',
};

export const CHALLENGE_STATUS_BADGE: Record<OrgChallengeStatus, string> = {
  [ChallengeStatus.ABIERTO]: 'bg-green-100 text-green-700',
  [ChallengeStatus.EN_PROGRESO]: 'bg-blue-100 text-blue-700',
  [ChallengeStatus.CERRADO]: 'bg-gray-100 text-gray-600',
};

// ── Estado de postulaciones ──

export type ApplicantStatus = InteractionStatus;

export const APP_STATUS_LABEL: Record<ApplicantStatus, string> = {
  [InteractionStatus.PENDIENTE]: 'Pendiente',
  [InteractionStatus.APROBADO]: 'Aprobado',
  [InteractionStatus.RECHAZADO]: 'Rechazado',
};

export const APP_STATUS_BADGE: Record<ApplicantStatus, string> = {
  [InteractionStatus.PENDIENTE]: 'bg-yellow-100 text-yellow-700',
  [InteractionStatus.APROBADO]: 'bg-green-100 text-green-700',
  [InteractionStatus.RECHAZADO]: 'bg-red-100 text-red-700',
};

// ── Perfiles / datos simulados ──

export const ORG_PROFILE = {
  sector: 'Artesanías y comercio tradicional',
  telefono: '+57 300 123 4567',
  descripcion:
    'Empresa familiar con más de 20 años fabricando hamacas, chinchorros y tejidos tradicionales de la costa colombiana. Buscamos conectar nuestras problemáticas productivas con el talento universitario de la región Caribe.',
  logoInicial: 'A',
};

export const STUDENT_SKILLS = [
  'Python',
  'Machine Learning',
  'XGBoost',
  'Pandas',
  'React',
  'Redes',
  'ISO 27001',
  'Nmap',
];

export const STUDENT_PROFILE = {
  programa_academico: 'Ingeniería de Sistemas',
  afiliacion_academica: 'Rama Estudiantil IEEE',
  semestre: '8° semestre',
  email: 'leonardo@vialibre.edu.co',
};

// ── Admin: métricas KPI y usuarios ──

export interface AdminKpi {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down';
  accent: 'primary' | 'secondary' | 'amber' | 'sky';
}

export const ADMIN_KPIS: AdminKpi[] = [
  { id: 'kpi-challenges', label: 'Total Problemáticas', value: '128', delta: '+12 este mes', trend: 'up', accent: 'primary' },
  { id: 'kpi-students', label: 'Estudiantes Activos', value: '1.420', delta: '+84 este mes', trend: 'up', accent: 'secondary' },
  { id: 'kpi-matches', label: 'Matches Exitosos', value: '96', delta: '+18 este mes', trend: 'up', accent: 'amber' },
  { id: 'kpi-ads', label: 'Pautas Activas', value: '1', delta: 'Slot único', trend: 'up', accent: 'sky' },
];

export interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export const ADMIN_USERS: AdminUserRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Juan Camilo Llamas Cardenas',
    email: 'admin@vialibre.edu.co',
    role: UserRole.ADMIN,
    is_active: true,
    created_at: '2026-01-10',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Artesanías Llamas',
    email: 'contacto@artesaniasllamas.com',
    role: UserRole.PUBLICADOR,
    is_active: true,
    created_at: '2026-02-14',
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Leonardo Barraza',
    email: 'leonardo@vialibre.edu.co',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    created_at: '2026-03-02',
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Agropecuaria Malambo',
    email: 'contacto@malambo.com',
    role: UserRole.PUBLICADOR,
    is_active: true,
    created_at: '2026-04-21',
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Rama Estudiantil IEEE',
    email: 'ieee@vialibre.edu.co',
    role: UserRole.SOLUCIONADOR,
    is_active: false,
    created_at: '2026-05-11',
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Valentina Gómez',
    email: 'valentina@vialibre.edu.co',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    created_at: '2026-06-30',
  },
];

export const ROLE_LABEL: Record<UserRole, string> = {
  [UserRole.PUBLICADOR]: 'Empresa',
  [UserRole.SOLUCIONADOR]: 'Estudiante',
  [UserRole.EGRESADO]: 'Egresado',
  [UserRole.ADMIN]: 'Administración',
};
