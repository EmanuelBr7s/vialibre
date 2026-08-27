// ── Single Paid Ad Slot ──
// El anuncio se muestra solo si la fecha actual es menor a la fecha de
// vencimiento. Si no hay anuncio activo, se muestra el estado por defecto.

export interface AdSlot {
  id: string;
  empresa?: string;
  title: string;
  description: string;
  image_url?: string;
  link_url?: string;
  expiration_date: string; // ISO 8601
}

// Anuncio activo de ejemplo (expira en 30 días).
// Set a `null` para forzar el estado "Espacio disponible para pauta".
export const currentAd: AdSlot | null = {
  id: 'ad-001',
  empresa: 'SoftCaribe S.A.S',
  title: 'SoftCaribe',
  description: 'Únete a nuestro programa de pasantías en tecnología y transforma el Caribe.',
  image_url: '',
  link_url: 'https://softcaribe.example.com',
  expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const AD_FALLBACK = {
  title: 'Espacio disponible para pauta',
  description: 'Tu empresa puede estar aquí. Contáctanos para publicidad y suscripciones.',
};
