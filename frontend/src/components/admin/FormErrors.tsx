import StatusAlert from '@/components/admin/StatusAlert';

interface FormErrorsProps {
  /** Error devuelto por el servidor al enviar. */
  formError: string | null;
  /** Errores de validación por campo (para el resumen). */
  fieldErrors: Record<string, string>;
}

/**
 * Aviso del formulario, colocado junto a los botones: es donde está mirando
 * quien acaba de enviar. Muestra el error del servidor o, si la validación
 * falló, cuántos campos hay que revisar.
 */
export default function FormErrors({ formError, fieldErrors }: FormErrorsProps) {
  const count = Object.keys(fieldErrors).length;
  if (formError) return <StatusAlert tone="error">{formError}</StatusAlert>;
  if (count === 0) return null;
  return (
    <StatusAlert tone="error">
      {count === 1
        ? 'Revisa el campo marcado antes de continuar.'
        : `Revisa los ${count} campos marcados antes de continuar.`}
    </StatusAlert>
  );
}
