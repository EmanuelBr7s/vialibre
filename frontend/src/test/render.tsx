import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/Toast';

/** Renderiza con los proveedores que la app monta en el layout raíz. */
export function renderWithProviders(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
