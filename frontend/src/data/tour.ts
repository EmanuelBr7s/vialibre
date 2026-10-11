/**
 * Datos y constantes del sistema de onboarding (wizard) y recorrido guiado.
 * Cada rol (publicador, solucionador, admin) tiene sus propios pasos.
 */

export type TourRole = 'publicador' | 'solucionador' | 'admin';

export type OnboardingIcon =
  | 'community'
  | 'publish'
  | 'profile'
  | 'apply'
  | 'evaluate';

export interface OnboardingSlide {
  icon: OnboardingIcon;
  title: string;
  description: string;
}

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** Selector del elemento a resaltar (usa atributos data-tour). */
  selector: string;
  /** El paso ocurre dentro del menú desplegable de usuario (se abre automáticamente). */
  requiresMenu?: boolean;
}

/** Clave que marca el onboarding (wizard) como completado. */
export const ONBOARDING_KEY = 'vialibre_onboarding_completed';

/**
 * Clave de onboarding por usuario: el wizard se activa una única vez por cuenta,
 * no por navegador.
 */
export function onboardingKey(userId: string): string {
  return `${ONBOARDING_KEY}:${userId}`;
}
/** Clave que marca el recorrido guiado (tooltips) como completado. */
export const TOUR_COMPLETED_KEY = 'vialibre_tour_completed';
/** Clase del body mientras un paso del tour ocurre dentro del menú de usuario. */
export const TOUR_MENU_BODY_CLASS = 'tour-menu-open';
/** Evento custom para abrir/cerrar el menú de usuario desde el tour. */
export const TOUR_MENU_EVENT = 'vialibre:tour-menu';

export const ONBOARDING_STEPS: Record<TourRole, OnboardingSlide[]> = {
  publicador: [
    {
      icon: 'community',
      title: 'Bienvenido a VíaLibre',
      description:
        'Plataforma de innovación abierta que conecta las problemáticas reales de empresas y fundaciones con el talento universitario de la Universidad Libre.',
    },
    {
      icon: 'publish',
      title: 'Publica tus Problemáticas',
      description:
        'Estructura retos reales de tu organización y recibe soluciones y propuestas del talento universitario, con alcance y herramientas claras.',
    },
    {
      icon: 'evaluate',
      title: 'Evalúa y Contacta',
      description:
        'Revisa los postulados a cada problemática, evalúa perfiles y CV, y libera la información de contacto de los mejores candidatos.',
    },
  ],
  solucionador: [
    {
      icon: 'community',
      title: 'Bienvenido a VíaLibre',
      description:
        'Forma parte de la comunidad de innovación abierta donde el talento universitario resuelve retos reales del sector productivo.',
    },
    {
      icon: 'profile',
      title: 'Completa tu Perfil y CV',
      description:
        'Personaliza tu perfil académico con tus habilidades, tu semillero y tu hoja de vida (CV) para destacar ante las empresas.',
    },
    {
      icon: 'apply',
      title: 'Postúlate y Conecta',
      description:
        'Explora problemáticas reales publicadas por empresas y fundaciones y envía tus propuestas para conectarte con ellas.',
    },
  ],
  admin: [
    {
      icon: 'community',
      title: 'Bienvenido a VíaLibre',
      description:
        'Panel de administración de la plataforma: gestiona usuarios, problemáticas y anuncios de la comunidad.',
    },
    {
      icon: 'publish',
      title: 'Administración de la plataforma',
      description:
        'Desde tu panel puedes revisar la actividad, gestionar anuncios y pautas publicitarias y mantener la información actualizada.',
    },
    {
      icon: 'evaluate',
      title: 'Supervisa la comunidad',
      description:
        'Monitorea las problemáticas y postulaciones de la plataforma para apoyar la conexión entre empresas y talento.',
    },
  ],
};

export const TOUR_STEPS: Record<TourRole, TourStep[]> = {
  publicador: [
    {
      id: 'perfil-org',
      title: 'Perfil de Organización',
      description:
        'Aquí puedes personalizar los datos de tu empresa y mantener tu información actualizada.',
      selector: '[data-tour="menu-perfil-org"]',
      requiresMenu: true,
    },
    {
      id: 'publicar',
      title: 'Publica tu Problemática',
      description:
        'Haz clic aquí para publicar un nuevo desafío corporativo y recibir propuestas de estudiantes.',
      selector: '[data-tour="publicar"]',
    },
    {
      id: 'feed',
      title: 'Explora el Feed',
      description:
        'Revisa otras problemáticas activas en la plataforma y sus propuestas.',
      selector: '[data-tour="feed-section"]',
    },
  ],
  solucionador: [
    {
      id: 'mi-perfil',
      title: 'Mi Perfil Académico',
      description:
        'Personaliza tus habilidades, semillero y sube tu Hoja de Vida (CV) para destacar.',
      selector: '[data-tour="menu-mi-perfil"]',
      requiresMenu: true,
    },
    {
      id: 'explorar',
      title: 'Explorar Problemáticas',
      description:
        'Aquí encuentras todas las ofertas y desafíos empresariales activos a los que puedes postularte.',
      selector: '[data-tour="explorar"]',
    },
    {
      id: 'ad-slot',
      title: 'Aliados y oportunidades',
      description:
        'Conoce a nuestros aliados estratégicos y oportunidades adicionales de la comunidad.',
      selector: '[data-tour="ad-slot"]',
    },
  ],
  admin: [
    {
      id: 'panel-admin',
      title: 'Panel de Administración',
      description:
        'Accede al panel para gestionar usuarios, anuncios y la actividad de la plataforma.',
      selector: '[data-tour="menu-panel-admin"]',
      requiresMenu: true,
    },
    {
      id: 'feed',
      title: 'Explora el Feed',
      description:
        'Revisa las problemáticas activas en la plataforma y sus propuestas.',
      selector: '[data-tour="feed-section"]',
    },
    {
      id: 'ad-slot',
      title: 'Gestión de anuncios',
      description:
        'El anuncio de aliados y oportunidades se administra desde la sección de anuncios y pautas.',
      selector: '[data-tour="ad-slot"]',
    },
  ],
};