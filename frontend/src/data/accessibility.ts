// ── Accesibilidad Universal: constantes compartidas ──

export type FontSize = 'small' | 'normal' | 'large' | 'xlarge';

export type ContrastMode =
  | 'none'
  | 'dark'
  | 'light'
  | 'grayscale'
  | 'protanopia'
  | 'deuteranopia';

export interface FontSizeOption {
  id: FontSize;
  label: string;
  /** Pantalla de ejemplo para el selector. */
  sample: string;
}

export const FONT_SIZES: FontSizeOption[] = [
  { id: 'small', label: 'Pequeña', sample: 'Aa' },
  { id: 'normal', label: 'Normal', sample: 'Aa' },
  { id: 'large', label: 'Grande', sample: 'Aa' },
  { id: 'xlarge', label: 'Extra Grande', sample: 'Aa' },
];

export interface ContrastOption {
  id: ContrastMode;
  label: string;
  description: string;
}

export const CONTRAST_MODES: ContrastOption[] = [
  { id: 'none', label: 'Sin filtro', description: 'Colores originales de la interfaz.' },
  { id: 'dark', label: 'Alto contraste oscuro', description: 'Fondo oscuro con texto claro de máximo contraste.' },
  { id: 'light', label: 'Alto contraste claro', description: 'Fondo claro con texto oscuro de máximo contraste.' },
  { id: 'grayscale', label: 'Escala de grises', description: 'Elimina color y busca claro/oscuro.' },
  { id: 'protanopia', label: 'Protanopia', description: 'Dificultad para distinguir tonos rojo/verde.' },
  { id: 'deuteranopia', label: 'Deuteranopia', description: 'Dificultad para distinguir tonos rojo/verde.' },
];

export interface KeyboardShortcut {
  keys: string[];
  action: string;
  scope: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { keys: ['Tab'], action: 'Navegar entre elementos enlazados y botones', scope: 'Global' },
  { keys: ['Shift', 'Tab'], action: 'Navegar en orden inverso', scope: 'Global' },
  { keys: ['Enter', 'Espacio'], action: 'Activar el elemento con foco', scope: 'Global' },
  { keys: ['Esc'], action: 'Cerrar menú, modal o panel', scope: 'Global' },
  { keys: ['?', 'C'], action: 'Abrir la guía de atajos de teclado', scope: 'Global' },
  { keys: ['A'], action: 'Abrir el panel de accesibilidad', scope: 'Global' },
  { keys: ['G'], action: 'Ir a la lista de problemáticas (feed)', scope: 'Autenticado' },
  { keys: ['S'], action: 'Ir a Configuración', scope: 'Autenticado' },
];
