import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { replaceMock, pushMock, listTutoresDocentes, createTutorDocente, updateTutorDocente, clearToken } =
  vi.hoisted(() => ({
    replaceMock: vi.fn(),
    pushMock: vi.fn(),
    listTutoresDocentes: vi.fn(),
    createTutorDocente: vi.fn(),
    updateTutorDocente: vi.fn(),
    clearToken: vi.fn(),
  }));

vi.mock('next/navigation', () => {
  const router = { replace: replaceMock, push: pushMock };
  return { useRouter: () => router };
});

vi.mock('@/components/Sidebar', () => ({ default: () => <aside aria-label="sidebar" /> }));

vi.mock('@/hooks/useRoleGuard', () => ({ useRoleGuard: () => true }));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { listTutoresDocentes, createTutorDocente, updateTutorDocente, clearToken },
  };
});

import { ApiError } from '@/lib/api';
import AdminTutoresPage from '@/app/admin/tutores/page';

const TUTOR = {
  id: 't1',
  identificacion: '123',
  nombres: 'Ana',
  apellidos: 'Pérez',
  email: 'ana@uni.edu.co',
  telefono: null,
  programa_academico: 'Ingeniería',
  user_id: null,
  activo: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

beforeEach(() => {
  replaceMock.mockReset();
  pushMock.mockReset();
  listTutoresDocentes.mockReset();
  createTutorDocente.mockReset();
  updateTutorDocente.mockReset();
  clearToken.mockReset();
});

describe('AdminTutoresPage', () => {
  it('lista los tutores devueltos por el backend', async () => {
    listTutoresDocentes.mockResolvedValue({ tutores: [TUTOR], total: 1, skip: 0, limit: 20 });

    render(<AdminTutoresPage />);

    // Escritorio (tabla) y móvil (tarjetas) se renderizan a la vez; el CSS decide cuál se ve.
    const table = await screen.findByRole('table', { name: 'Tutores registrados' });
    expect(within(table).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(table).getByText('ana@uni.edu.co')).toBeInTheDocument();

    const cards = screen.getByRole('list', { name: 'Tutores registrados' });
    expect(within(cards).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(cards).getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay registros', async () => {
    listTutoresDocentes.mockResolvedValue({ tutores: [], total: 0, skip: 0, limit: 20 });

    render(<AdminTutoresPage />);

    expect(await screen.findByText('No hay tutores docentes registrados.')).toBeInTheDocument();
  });

  it('muestra el error del backend cuando falla la carga', async () => {
    listTutoresDocentes.mockRejectedValue(new ApiError('Operación exclusiva del rol admin', 403));

    render(<AdminTutoresPage />);

    expect(await screen.findByText('Operación exclusiva del rol admin')).toBeInTheDocument();
  });

  it('ante 401 borra el token y redirige a /login', async () => {
    listTutoresDocentes.mockRejectedValue(new ApiError('No autenticado', 401));

    render(<AdminTutoresPage />);

    await waitFor(() => expect(clearToken).toHaveBeenCalled());
    expect(replaceMock).toHaveBeenCalledWith('/login');
  });

  it('registra un tutor y recarga el listado', async () => {
    listTutoresDocentes.mockResolvedValue({ tutores: [], total: 0, skip: 0, limit: 20 });
    createTutorDocente.mockResolvedValue({ ...TUTOR, id: 't2' });
    const user = userEvent.setup();

    render(<AdminTutoresPage />);
    await screen.findByText('No hay tutores docentes registrados.');

    await user.click(screen.getByRole('button', { name: 'Nuevo tutor' }));
    await user.type(screen.getByLabelText(/Nombres/), 'Luis');
    await user.click(screen.getByRole('button', { name: 'Registrar tutor' }));

    await waitFor(() =>
      expect(createTutorDocente).toHaveBeenCalledWith(
        expect.objectContaining({ nombres: 'Luis', apellidos: null, activo: true })
      )
    );
    expect(await screen.findByText('Tutor registrado correctamente.')).toBeInTheDocument();
  });

  it('valida el correo en cliente antes de llamar al backend', async () => {
    listTutoresDocentes.mockResolvedValue({ tutores: [], total: 0, skip: 0, limit: 20 });
    const user = userEvent.setup();

    render(<AdminTutoresPage />);
    await screen.findByText('No hay tutores docentes registrados.');

    await user.click(screen.getByRole('button', { name: 'Nuevo tutor' }));
    await user.type(screen.getByLabelText(/Correo electrónico/), 'correo-malo');
    await user.click(screen.getByRole('button', { name: 'Registrar tutor' }));

    expect(await screen.findByText('El correo no tiene un formato válido.')).toBeInTheDocument();
    expect(createTutorDocente).not.toHaveBeenCalled();
  });
});
