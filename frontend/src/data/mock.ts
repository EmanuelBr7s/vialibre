// ── Datos mock contextualizados ──
// Vistas funcionales de demostración para los módulos del menú de usuario.
// La información real se obtiene de la API cuando existe; aquí se usan datos
// realistas cuando la API no cubre el flujo (problemáticas de la org, KPIs admin,
// perfiles editables, etc.).

import type { Challenge, ContactInfo, Empresa, Interaction, Practica, TutorDocente, User } from '@/types';
import { ChallengeStatus, ChallengeTipo, DifficultyLevel, InteractionStatus, Modalidad, UserRole } from '@/types';

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

// ── Modo mock: universo de datos autocontenido ──
// Usado por el cliente API (src/lib/mockApi.ts) cuando NEXT_PUBLIC_API_MOCK=true.
// Los IDs reutilizan los de ADMIN_USERS / ORG_CHALLENGES para mantener coerencia
// entre el feed, los postulantes y las vistas admin.

export const MOCK_USER_IDS = {
  admin: '00000000-0000-0000-0000-000000000001',
  artesanias: '00000000-0000-0000-0000-000000000002',
  leonardo: '00000000-0000-0000-0000-000000000003',
  malambo: '00000000-0000-0000-0000-000000000004',
  valentina: '00000000-0000-0000-0000-000000000006',
  camila: '00000000-0000-0000-0000-000000000007',
  andres: '00000000-0000-0000-0000-000000000008',
  maria: '00000000-0000-0000-0000-000000000009',
  sebastian: '00000000-0000-0000-0000-000000000010',
  cafe: '00000000-0000-0000-0000-000000000011',
  alcaldia: '00000000-0000-0000-0000-000000000012',
} as const;

export interface DemoAccount {
  role: UserRole;
  label: string;
  email: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: UserRole.ADMIN,
    label: 'Admin',
    email: 'admin@vialibre.edu.co',
    description: 'Juan Camilo Llamas · dashboard de administración',
  },
  {
    role: UserRole.PUBLICADOR,
    label: 'Publicador',
    email: 'contacto@artesaniasllamas.com',
    description: 'Artesanías Llamas · publica y gestiona problemáticas',
  },
  {
    role: UserRole.SOLUCIONADOR,
    label: 'Solucionador',
    email: 'leonardo@vialibre.edu.co',
    description: 'Leonardo Barraza · explora y postúlate',
  },
];

export const MOCK_USERS: User[] = [
  {
    id: MOCK_USER_IDS.admin,
    email: 'admin@vialibre.edu.co',
    full_name: 'Juan Camilo Llamas Cardenas',
    role: UserRole.ADMIN,
    is_active: true,
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-01-10T09:00:00Z',
    updated_at: '2026-01-10T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.artesanias,
    email: 'contacto@artesaniasllamas.com',
    full_name: 'Artesanías Llamas',
    role: UserRole.PUBLICADOR,
    is_active: true,
    phone: '+57 300 123 4567',
    empresa_nombre: 'Artesanías Llamas',
    bio: 'Empresa familiar con más de 20 años fabricando hamacas, chinchorros y tejidos tradicionales de la costa colombiana.',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-02-14T09:00:00Z',
    updated_at: '2026-02-14T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.leonardo,
    email: 'leonardo@vialibre.edu.co',
    full_name: 'Leonardo Barraza',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 301 555 0103',
    programa_academico: 'Ingeniería de Sistemas',
    afiliacion_academica: 'Rama Estudiantil IEEE',
    bio: 'Estudiante de Ingeniería de Sistemas, apasionado por ML aplicado al agro.',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-03-02T09:00:00Z',
    updated_at: '2026-03-02T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.malambo,
    email: 'contacto@malambo.com',
    full_name: 'Agropecuaria Malambo',
    role: UserRole.PUBLICADOR,
    is_active: true,
    phone: '+57 305 555 0104',
    empresa_nombre: 'Agropecuaria Malambo',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-04-21T09:00:00Z',
    updated_at: '2026-04-21T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.valentina,
    email: 'valentina@vialibre.edu.co',
    full_name: 'Valentina Gómez',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 302 555 0106',
    programa_academico: 'Ingeniería Industrial',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-06-30T09:00:00Z',
    updated_at: '2026-06-30T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.camila,
    email: 'camila.torres@vialibre.edu.co',
    full_name: 'Camila Torres',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 303 555 0107',
    programa_academico: 'Ingeniería de Sistemas',
    afiliacion_academica: 'Semillero IA Caribe',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-07-05T09:00:00Z',
    updated_at: '2026-07-05T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.andres,
    email: 'andres.martinez@vialibre.edu.co',
    full_name: 'Andrés Martínez',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 304 555 0108',
    programa_academico: 'Ingeniería Electrónica',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-07-12T09:00:00Z',
    updated_at: '2026-07-12T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.maria,
    email: 'maria.lopez@vialibre.edu.co',
    full_name: 'María Fernanda López',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 301 555 0109',
    programa_academico: 'Matemáticas',
    afiliacion_academica: 'Semillero de Optimización',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-07-20T09:00:00Z',
    updated_at: '2026-07-20T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.sebastian,
    email: 'sebastian.rojas@vialibre.edu.co',
    full_name: 'Sebastián Rojas',
    role: UserRole.SOLUCIONADOR,
    is_active: true,
    phone: '+57 305 555 0110',
    programa_academico: 'Ingeniería Ambiental',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-08-01T09:00:00Z',
    updated_at: '2026-08-01T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.cafe,
    email: 'contacto@cafedelrio.com',
    full_name: 'Cooperativa Café del Río',
    role: UserRole.PUBLICADOR,
    is_active: true,
    phone: '+57 302 555 0111',
    empresa_nombre: 'Cooperativa Café del Río',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-05-18T09:00:00Z',
    updated_at: '2026-05-18T09:00:00Z',
  },
  {
    id: MOCK_USER_IDS.alcaldia,
    email: 'datos@soledad.gov.co',
    full_name: 'Alcaldía de Soledad',
    role: UserRole.PUBLICADOR,
    is_active: true,
    phone: '+57 300 555 0112',
    empresa_nombre: 'Alcaldía de Soledad',
    skills: [],
    soft_skills: [],
    disponible: true,
    created_at: '2026-04-02T09:00:00Z',
    updated_at: '2026-04-02T09:00:00Z',
  },
];

export const MOCK_CHALLENGE_IDS = {
  mango: 'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ecommerce: 'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  iso27001: 'cccc3333-cccc-cccc-cccc-cccccccccccc',
  frio: 'dddd4444-4444-4d44-8d44-444444444444',
  cafe: 'eeee5555-5555-4e55-8e55-555555555555',
  bi: 'ffff6666-6666-4f66-8f66-666666666666',
  riego: 'abcd7777-7777-4a77-8a77-777777777777',
} as const;

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: MOCK_CHALLENGE_IDS.mango,
    title: 'Modelo predictivo para rendimiento de mango de hilaza',
    short_description:
      'Aplicar modelos de Machine Learning con variables agroclimáticas para predecir cosechas.',
    long_description:
      'Artesanías Llamas cultiva mango de hilaza en el Atlántico y necesita anticipar el rendimiento de cada cosecha para planear compras, logística y exportación. Esperamos un modelo supervisado con variables agroclimáticas (precipitación, temperatura, humedad) e históricos de producción que entregue proyecciones por finca y por temporada, con un dashboard sencillo para el equipo agrícola.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.artesanias,
    category_id: 'cat:agro',
    status: ChallengeStatus.EN_PROGRESO,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['Machine Learning', 'Agro', 'Python'],
    budget: 12000000,
    deadline: '2026-12-15T23:59:59-05:00',
    is_featured: true,
    featured_score: 9.4,
    created_at: '2026-08-02T14:30:00Z',
    updated_at: '2026-08-30T10:00:00Z',
    author_name: 'Artesanías Llamas',
    empresa_nombre: 'Artesanías Llamas',
  },
  {
    id: MOCK_CHALLENGE_IDS.ecommerce,
    title: 'Diseño de plataforma E-commerce y gestión de marca',
    short_description:
      'Digitalizar el catálogo de productos artesanales y posicionar la marca a nivel regional.',
    long_description:
      'Buscamos digitalizar el catálogo de hamacas, chinchorros y tejidos tradicionales. Se requiere una tienda en línea con gestión de inventario, pasarela de pagos y una estrategia de marca que posicione el producto a nivel regional y nacional, manteniendo la identidad artesanal.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.artesanias,
    category_id: 'cat:comercio',
    status: ChallengeStatus.ABIERTO,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['E-commerce', 'Diseño de marca', 'React'],
    budget: 10000000,
    deadline: '2026-11-30T23:59:59-05:00',
    is_featured: true,
    featured_score: 8.7,
    created_at: '2026-08-17T09:15:00Z',
    updated_at: '2026-08-17T09:15:00Z',
    author_name: 'Artesanías Llamas',
    empresa_nombre: 'Artesanías Llamas',
  },
  {
    id: MOCK_CHALLENGE_IDS.iso27001,
    title: 'Auditoría de seguridad y análisis de red (ISO 27001)',
    short_description:
      'Análisis de vulnerabilidades y levantamiento de la estructura de red actual.',
    long_description:
      'La organización mantiene su operación comercial sobre una red local con varios puntos de venta y teletrabajo. Se requiere un análisis de vulnerabilidades, levantamiento de la arquitectura de red actual y recomendaciones priorizadas para cumplir los controles básicos de ISO/IEC 27001.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.artesanias,
    category_id: 'cat:seguridad',
    status: ChallengeStatus.CERRADO,
    difficulty: DifficultyLevel.HARD,
    tags: ['Seguridad', 'ISO 27001', 'Redes'],
    budget: 15000000,
    deadline: '2026-09-20T23:59:59-05:00',
    is_featured: false,
    featured_score: 6.1,
    created_at: '2026-07-20T08:00:00Z',
    updated_at: '2026-08-05T08:00:00Z',
    author_name: 'Artesanías Llamas',
    empresa_nombre: 'Artesanías Llamas',
  },
  {
    id: MOCK_CHALLENGE_IDS.frio,
    title: 'Optimización logística de cadena de frío para floricultura',
    short_description:
      'Reducir pérdidas en la cadena de frío con sensores IoT y optimización de rutas.',
    long_description:
      'Agropecuaria Malambo exporta flores y necesita reducir pérdidas en la cadena de frío. Buscamos un modelo de optimización de rutas y temperaturas con sensores IoT para minimizar mermas y consumo energético sin afectar la calidad del producto.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.malambo,
    category_id: 'cat:logistica',
    status: ChallengeStatus.ABIERTO,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['Logística', 'Optimización', 'IoT'],
    budget: 18000000,
    deadline: '2026-12-05T23:59:59-05:00',
    is_featured: true,
    featured_score: 8.1,
    created_at: '2026-08-25T16:45:00Z',
    updated_at: '2026-08-25T16:45:00Z',
    author_name: 'Agropecuaria Malambo',
    empresa_nombre: 'Agropecuaria Malambo',
  },
  {
    id: MOCK_CHALLENGE_IDS.cafe,
    title: 'Clasificación de calidad de café usando visión por computador',
    short_description:
      'Clasificar el café pergamino por calidad con modelos de visión por computador.',
    long_description:
      'La Cooperativa Café del Río quiere sortear el café por calidad con visión por computador. Se requiere un clasificador por imágenes (defectos, tamaño, color) que se integre con el proceso actual de secado y beneficio.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.cafe,
    category_id: 'cat:agro',
    status: ChallengeStatus.ABIERTO,
    difficulty: DifficultyLevel.HARD,
    tags: ['Visión por computador', 'Python', 'Sostenibilidad'],
    budget: 9000000,
    deadline: '2026-11-15T23:59:59-05:00',
    is_featured: false,
    featured_score: 7.4,
    created_at: '2026-09-01T11:20:00Z',
    updated_at: '2026-09-01T11:20:00Z',
    author_name: 'Cooperativa Café del Río',
    empresa_nombre: 'Cooperativa Café del Río',
  },
  {
    id: MOCK_CHALLENGE_IDS.bi,
    title: 'Panel de indicadores (BI) para gestión municipal',
    short_description:
      'Panel de indicadores abiertos para transparentar la gestión y priorizar proyectos.',
    long_description:
      'La Alcaldía de Soledad busca un panel de indicadores con los datos públicos de gestión (inversión, movilidad, seguridad) para transparentar la información y priorizar proyectos con evidencia.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.alcaldia,
    category_id: 'cat:bi',
    status: ChallengeStatus.ABIERTO,
    difficulty: DifficultyLevel.MEDIUM,
    tags: ['Business Intelligence', 'Datos abiertos', 'Dashboards'],
    budget: 22000000,
    deadline: '2026-12-20T23:59:59-05:00',
    is_featured: true,
    featured_score: 7.9,
    created_at: '2026-09-05T10:00:00Z',
    updated_at: '2026-09-05T10:00:00Z',
    author_name: 'Alcaldía de Soledad',
    empresa_nombre: 'Alcaldía de Soledad',
  },
  {
    id: MOCK_CHALLENGE_IDS.riego,
    title: 'Sistema de riego inteligente de bajo consumo para hortalizas',
    short_description:
      'Diseño de un sistema de riego económico para invernaderos con sensores de humedad.',
    long_description:
      'Diseño de un sistema de riego de bajo consumo para hortalizas de invernadero usando sensores de humedad de suelo y una lógica de control simple, pensado para pequeños agricultores de la región Caribe.',
    tipo: ChallengeTipo.RETO,
    author_id: MOCK_USER_IDS.malambo,
    category_id: 'cat:agro',
    status: ChallengeStatus.ABIERTO,
    difficulty: DifficultyLevel.EASY,
    tags: ['IoT', 'Riego', 'Agro'],
    budget: 5000000,
    deadline: '2026-10-30T23:59:59-05:00',
    is_featured: false,
    featured_score: 5.8,
    created_at: '2026-09-08T09:30:00Z',
    updated_at: '2026-09-08T09:30:00Z',
    author_name: 'Agropecuaria Malambo',
    empresa_nombre: 'Agropecuaria Malambo',
  },
];

// Interacciones semilla: postulaciones de Leonardo (coinciden con MY_APPLICATIONS)
// y postulantes de las problemáticas de Artesanías Llamas para el publicador demo.
export const MOCK_INTERACTIONS: Interaction[] = [
  {
    id: 'mock-int-app-1',
    solucionador_id: MOCK_USER_IDS.leonardo,
    challenge_id: MOCK_CHALLENGE_IDS.mango,
    status: InteractionStatus.APROBADO,
    message:
      'Cuento con experiencia en modelos de regresión con XGBoost y Random Forest sobre datos agroclimáticos.',
    contact_unlocked: true,
    contact_unlocked_at: '2026-08-25T15:00:00Z',
    created_at: '2026-08-10T13:00:00Z',
    updated_at: '2026-08-25T15:00:00Z',
  },
  {
    id: 'mock-int-app-2',
    solucionador_id: MOCK_USER_IDS.leonardo,
    challenge_id: MOCK_CHALLENGE_IDS.ecommerce,
    status: InteractionStatus.PENDIENTE,
    message: 'Propongo construir la tienda con Next.js y un panel de inventario integrado.',
    contact_unlocked: false,
    created_at: '2026-08-20T10:30:00Z',
    updated_at: '2026-08-20T10:30:00Z',
  },
  {
    id: 'mock-int-app-3',
    solucionador_id: MOCK_USER_IDS.leonardo,
    challenge_id: MOCK_CHALLENGE_IDS.iso27001,
    status: InteractionStatus.RECHAZADO,
    message: null,
    contact_unlocked: false,
    created_at: '2026-07-22T09:00:00Z',
    updated_at: '2026-08-05T09:00:00Z',
  },
  {
    id: 'mock-int-aaaa-1',
    solucionador_id: MOCK_USER_IDS.valentina,
    challenge_id: MOCK_CHALLENGE_IDS.mango,
    status: InteractionStatus.PENDIENTE,
    message: 'He trabajado con series temporales en proyectos académicos del sector agroindustrial.',
    contact_unlocked: false,
    created_at: '2026-08-14T12:00:00Z',
    updated_at: '2026-08-14T12:00:00Z',
  },
  {
    id: 'mock-int-aaaa-2',
    solucionador_id: MOCK_USER_IDS.camila,
    challenge_id: MOCK_CHALLENGE_IDS.mango,
    status: InteractionStatus.PENDIENTE,
    message: 'Domino XGBoost, Random Forest y el preprocesamiento de datos climáticos.',
    contact_unlocked: false,
    created_at: '2026-08-16T17:20:00Z',
    updated_at: '2026-08-16T17:20:00Z',
  },
  {
    id: 'mock-int-aaaa-3',
    solucionador_id: MOCK_USER_IDS.andres,
    challenge_id: MOCK_CHALLENGE_IDS.mango,
    status: InteractionStatus.PENDIENTE,
    message: 'Experiencia con sensores agroclimáticos y despliegue de dashboards en la nube.',
    contact_unlocked: false,
    created_at: '2026-08-18T08:40:00Z',
    updated_at: '2026-08-18T08:40:00Z',
  },
  {
    id: 'mock-int-bbbb-1',
    solucionador_id: MOCK_USER_IDS.maria,
    challenge_id: MOCK_CHALLENGE_IDS.ecommerce,
    status: InteractionStatus.PENDIENTE,
    message: 'Propongo un diseño centrado en el usuario con foco en la conversión de catálogo.',
    contact_unlocked: false,
    created_at: '2026-08-22T15:10:00Z',
    updated_at: '2026-08-22T15:10:00Z',
  },
  {
    id: 'mock-int-bbbb-2',
    solucionador_id: MOCK_USER_IDS.sebastian,
    challenge_id: MOCK_CHALLENGE_IDS.ecommerce,
    status: InteractionStatus.PENDIENTE,
    message: 'Cuento con portafolio en comercio electrónico y estrategia de marca local.',
    contact_unlocked: false,
    created_at: '2026-08-24T09:05:00Z',
    updated_at: '2026-08-24T09:05:00Z',
  },
];

// ── Admin (modo mock): tutores docentes, empresas y prácticas formalizadas ──

export const MOCK_TUTORES: TutorDocente[] = [
  {
    id: 'aaaa0001-0000-4000-8000-000000000001',
    identificacion: '1045123456',
    nombres: 'Patricia',
    apellidos: 'Ospino Díaz',
    email: 'patricia.ospino@unilibre.edu.co',
    telefono: '+57 300 555 0201',
    programa_academico: 'Ingeniería de Sistemas',
    user_id: null,
    activo: true,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: 'aaaa0002-0000-4000-8000-000000000002',
    identificacion: '1045987654',
    nombres: 'Hernán',
    apellidos: 'Castro Mejía',
    email: 'hernan.castro@unilibre.edu.co',
    telefono: null,
    programa_academico: 'Ingeniería Industrial',
    user_id: null,
    activo: false,
    created_at: '2026-02-10T09:00:00Z',
    updated_at: '2026-02-10T09:00:00Z',
  },
];

/** Una empresa por cada usuario publicador de la demo. */
export const MOCK_EMPRESAS: Empresa[] = MOCK_USERS.filter((u) => u.role === UserRole.PUBLICADOR).map(
  (u, index) => ({
    id: `bbbb${String(index + 1).padStart(4, '0')}-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    nit: u.nit_empresa ?? null,
    razon_social: u.empresa_nombre ?? u.full_name,
    sector: null,
    representante_legal: u.full_name,
    contacto_email: u.email,
    contacto_telefono: u.phone ?? null,
    publicador_user_id: u.id,
    activa: true,
    created_at: u.created_at,
    updated_at: u.updated_at,
  })
);

/** Práctica ya formalizada sobre la primera postulación aprobada. */
export const MOCK_PRACTICAS: Practica[] = MOCK_INTERACTIONS.filter(
  (i) => i.status === InteractionStatus.APROBADO
)
  .slice(0, 1)
  .map((i) => ({
    id: 'cccc0001-0000-4000-8000-000000000001',
    challenge_id: i.challenge_id,
    interaction_id: i.id,
    solucionador_id: i.solucionador_id,
    empresa_id: MOCK_EMPRESAS[0]?.id ?? null,
    tutor_docente_id: MOCK_TUTORES[0].id,
    created_by: null,
    estado_administrativo: 'en_proceso',
    modalidad: 'presencial',
    tipo_practica: 'empresarial',
    duracion_horas: 480,
    fecha_inicio: '2026-08-01',
    fecha_fin: '2026-12-15',
    anio_academico: '2026',
    periodo_academico: '2',
    bilingue: false,
    observaciones_institucionales: null,
    fecha_formalizacion: '2026-07-20T10:00:00Z',
    created_at: '2026-07-20T10:00:00Z',
    updated_at: '2026-07-20T10:00:00Z',
  }));
