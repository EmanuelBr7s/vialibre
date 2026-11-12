// Mensajes de error de la API en español.
// Los microservicios devuelven algunos `detail` en inglés y, cuando el servidor
// está arrancando, el proxy responde HTML o texto: aquí se traduce todo a un
// mensaje que el usuario pueda entender.

/** `detail` en inglés de los servicios → texto para el usuario. */
const DETAIL_TRANSLATIONS: Record<string, string> = {
  'Not authenticated': 'Inicia sesión para continuar.',
  'Invalid email or password': 'Correo o contraseña incorrectos.',
  'Account is deactivated': 'Tu cuenta está desactivada. Contacta al administrador.',
  'Email already registered': 'Ya existe una cuenta con ese correo.',
  'User not found': 'Usuario no encontrado.',
  'Challenge not found': 'Publicación no encontrada.',
  'Interaction not found': 'Postulación no encontrada.',
  'Reaction not found': 'Reacción no encontrada.',
  'You already applied to this challenge': 'Ya te postulaste a esta publicación.',
  'Only publicadores can create challenges': 'Solo las empresas y el administrador pueden publicar.',
  'Only publicadores can approve interactions': 'Solo las empresas pueden resolver postulaciones.',
  'Only the challenge author can view applicants': 'Solo quien publicó la oferta puede ver sus postulados.',
  'Only the challenge author can approve interactions':
    'Solo quien publicó la oferta puede resolver sus postulaciones.',
  'Not authorized to view this interaction': 'No tienes permiso para ver esta postulación.',
  'Not authorized to view contact info': 'No tienes permiso para ver este contacto.',
  'Not authorized to update this challenge': 'No tienes permiso para editar esta publicación.',
  'Not authorized to delete this interaction': 'No tienes permiso para eliminar esta postulación.',
  'Not authorized to delete this challenge': 'No tienes permiso para eliminar esta publicación.',
  'Interaction has already been resolved': 'Esta postulación ya fue resuelta.',
  'Invalid interaction status transition': 'Ese cambio de estado no está permitido.',
  'Contact information is not unlocked yet': 'El contacto se desbloquea cuando la postulación es aprobada.',
  'Could not verify challenge': 'No se pudo validar la publicación. Inténtalo de nuevo.',
  'Could not verify challenge ownership': 'No se pudo validar la publicación. Inténtalo de nuevo.',
  'Could not fetch user information': 'No se pudo consultar la información del usuario. Inténtalo de nuevo.',
  'Could not fetch challenge info': 'No se pudo consultar la publicación. Inténtalo de nuevo.',
  'Invalid internal service token': 'No se pudo completar la operación. Inténtalo de nuevo.',
  'Ya existe una practica formalizada para esta interaccion':
    'Ya existe una práctica formalizada para esta postulación.',
  'La interaccion indicada no existe': 'La postulación indicada no existe.',
  'Internal Server Error': 'Ocurrió un error en el servidor. Inténtalo de nuevo.',
  'Not Found': 'No se encontró lo que buscabas.',
  'Method Not Allowed': 'Operación no permitida.',
};

/** Mensaje por código HTTP cuando la respuesta no trae un `detail` utilizable. */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'La solicitud no es válida. Revisa los datos e inténtalo de nuevo.';
    case 401:
      return 'Tu sesión expiró. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 404:
      return 'No se encontró lo que buscabas.';
    case 409:
      return 'Ya existe un registro con esos datos.';
    case 413:
      return 'El archivo es demasiado grande.';
    case 422:
      return 'Hay datos que no son válidos. Revisa el formulario.';
    case 429:
      return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    case 502:
    case 503:
    case 504:
      return 'El servidor se está iniciando. Reintenta en unos segundos.';
    default:
      return status >= 500
        ? 'Ocurrió un error en el servidor. Inténtalo de nuevo.'
        : 'No se pudo completar la operación. Inténtalo de nuevo.';
  }
}

/** Sin respuesta del servidor (sin red, DNS, conexión cortada). */
export const NETWORK_ERROR_MESSAGE =
  'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';

/** Traduce un `detail` de texto; si no está en la tabla, lo deja como llegó. */
export function translateDetail(detail: string): string {
  const known = DETAIL_TRANSLATIONS[detail.trim()];
  if (known) return known;
  if (/^You already have a .+ reaction for this challenge$/.test(detail)) {
    return 'Ya reaccionaste a esta publicación.';
  }
  if (/^Invalid role: /.test(detail)) return 'El tipo de cuenta no es válido.';
  return detail;
}

/** Mensajes de validación de Pydantic (422) más frecuentes → español. */
function translateValidationMsg(msg: string): string {
  const text = msg.replace(/^Value error, /, '');
  if (/^Field required$/i.test(text)) return 'falta un campo obligatorio';
  const atMost = text.match(/^String should have at most (\d+) characters?$/i);
  if (atMost) return `el texto supera los ${atMost[1]} caracteres`;
  const atLeast = text.match(/^String should have at least (\d+) characters?$/i);
  if (atLeast) return `el texto necesita al menos ${atLeast[1]} caracteres`;
  if (/^Input should be a valid (integer|number)/i.test(text)) return 'se esperaba un número';
  if (/^Input should be a valid date/i.test(text)) return 'la fecha no es válida';
  if (/^Input should be a valid UUID/i.test(text)) return 'la referencia no es válida';
  if (/^value is not a valid email address/i.test(text)) return 'el correo no es válido';
  if (/^String should match pattern/i.test(text)) return 'el formato no es válido';
  if (/^Input should be '.+'/i.test(text)) return 'el valor no está entre las opciones permitidas';
  if (/^Input should be (greater|less) than/i.test(text)) return 'el número está fuera del rango permitido';
  return text;
}

/**
 * Mensaje para el usuario a partir del código HTTP y del cuerpo de la respuesta
 * (texto). Nunca devuelve una cadena vacía ni un mensaje técnico.
 */
export function messageForResponse(status: number, bodyText: string): string {
  let detail: unknown;
  try {
    detail = (JSON.parse(bodyText) as { detail?: unknown })?.detail;
  } catch {
    // Cuerpo HTML o texto plano (p. ej. el proxy mientras el servidor arranca).
    return messageForStatus(status);
  }

  if (typeof detail === 'string' && detail.trim()) return translateDetail(detail);

  if (Array.isArray(detail)) {
    const joined = detail
      .map((item: { msg?: string }) => (item?.msg ? translateValidationMsg(item.msg) : ''))
      .filter(Boolean)
      .join('; ');
    if (joined) return joined;
  }

  return messageForStatus(status);
}
