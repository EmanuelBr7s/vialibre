import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/render';
import userEvent from '@testing-library/user-event';

const {
  replaceMock,
  listPracticas,
  listEmpresas,
  listTutoresDocentes,
  getChallenges,
  getChallengeApplicants,
  getUserById,
  createPractica,
  updatePractica,
  clearToken,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  listPracticas: vi.fn(),
  listEmpresas: vi.fn(),
  listTutoresDocentes: vi.fn(),
  getChallenges: vi.fn(),
  getChallengeApplicants: vi.fn(),
  getUserById: vi.fn(),
  createPractica: vi.fn(),
  updatePractica: vi.fn(),
  clearToken: vi.fn(),
}));

vi.mock('next/navigation', () => {
  const router = { replace: replaceMock, push: vi.fn() };
  return { useRouter: () => router };
});

vi.mock('@/components/Sidebar', () => ({ default: () => <aside aria-label="sidebar" /> }));

vi.mock('@/hooks/useRoleGuard', () => ({ useRoleGuard: () => true }));

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      listPracticas,
      listEmpresas,
      listTutoresDocentes,
      getChallenges,
      getChallengeApplicants,
      getUserById,
      createPractica,
      updatePractica,
      clearToken,
    },
  };
});

import { ApiError } from '@/lib/api';
import AdminPracticasPage from '@/app/admin/practicas/page';

const CHALLENGE = {
  id: 'c1',
  title: 'Reto de ejemplo',
  tipo: 'practica',
  author_id: 'u-empresa',
};

/** Abre un combobox por su etiqueta y elige la opción cuyo nombre coincide. */
async function choose(user: ReturnType<typeof userEvent.setup>, label: string | RegExp, option: RegExp) {
  await user.click(screen.getByRole('combobox', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
}

const INTERACTION = {
  id: 'i1',
  solucionador_id: '11111111-1111-1111-1111-111111111111',
  challenge_id: 'c1',
  status: 'aprobado',
  contact_unlocked: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

function mockBaseCatalogs() {
  listPracticas.mockResolvedValue({ practicas: [], total: 0, skip: 0, limit: 20 });
  listEmpresas.mockResolvedValue({ empresas: [], total: 0, skip: 0, limit: 100 });
  listTutoresDocentes.mockResolvedValue({ tutores: [], total: 0, skip: 0, limit: 100 });
  getChallenges.mockResolvedValue({ challenges: [CHALLENGE], total: 1, skip: 0, limit: 100 });
  getChallengeApplicants.mockResolvedValue({ interactions: [INTERACTION], total: 1 });
  getUserById.mockResolvedValue({
    id: INTERACTION.solucionador_id,
    full_name: 'Ana Pérez',
    programa_academico: 'Ingeniería de Sistemas',
  });
}

beforeEach(() => {
  replaceMock.mockReset();
  listPracticas.mockReset();
  listEmpresas.mockReset();
  listTutoresDocentes.mockReset();
  getChallenges.mockReset();
  getChallengeApplicants.mockReset();
  getUserById.mockReset();
  createPractica.mockReset();
  updatePractica.mockReset();
  clearToken.mockReset();
});

describe('AdminPracticasPage', () => {
  it('muestra el estado vacío del listado', async () => {
    mockBaseCatalogs();

    renderWithProviders(<AdminPracticasPage />);

    expect(await screen.findByText('No hay prácticas formalizadas.')).toBeInTheDocument();
  });

  it('deshabilita el selector de empresa y muestra el aviso cuando falla su carga', async () => {
    mockBaseCatalogs();
    listEmpresas.mockRejectedValue(new ApiError('Operación exclusiva del rol admin', 403));
    const user = userEvent.setup();

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));

    expect(await screen.findByText('Operación exclusiva del rol admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa vinculada')).toBeDisabled();
  });

  it('formaliza una práctica enviando solo la interacción seleccionada', async () => {
    mockBaseCatalogs();
    createPractica.mockResolvedValue({ id: 'p1' });
    const user = userEvent.setup();

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await choose(user, 'Publicación de origen', /Reto de ejemplo/);
    await waitFor(() => expect(getUserById).toHaveBeenCalled());
    await choose(user, 'Postulación del estudiante', /Ana Pérez/);

    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    await waitFor(() => expect(createPractica).toHaveBeenCalled());
    const payload = createPractica.mock.calls[0][0];
    expect(payload.interaction_id).toBe('i1');
    expect(payload.challenge_id).toBeUndefined();
    expect(payload.solucionador_id).toBeUndefined();
  });

  it('la empresa propuesta sigue a la publicación elegida y respeta una elección manual', async () => {
    mockBaseCatalogs();
    const otra = { id: 'c2', title: 'Otra oferta', tipo: 'empleo', author_id: 'u-b' };
    getChallenges.mockResolvedValue({
      challenges: [{ ...CHALLENGE, author_id: 'u-a' }, otra],
      total: 2,
      skip: 0,
      limit: 100,
    });
    listEmpresas.mockResolvedValue({
      empresas: [
        { id: 'e-a', razon_social: 'Empresa A', nit: null, publicador_user_id: 'u-a', activa: true },
        { id: 'e-b', razon_social: 'Empresa B', nit: null, publicador_user_id: 'u-b', activa: true },
        { id: 'e-c', razon_social: 'Empresa C', nit: null, publicador_user_id: null, activa: true },
      ],
      total: 3,
      skip: 0,
      limit: 100,
    });
    const user = userEvent.setup();
    const empresa = () => (screen.getByRole('combobox', { name: 'Empresa vinculada' }) as HTMLInputElement).value;

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');
    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));

    await choose(user, /Publicación de origen/, /Reto de ejemplo/);
    await waitFor(() => expect(empresa()).toBe('Empresa A'));

    // Al cambiar de publicación, la propuesta cambia con ella.
    await choose(user, /Publicación de origen/, /Otra oferta/);
    await waitFor(() => expect(empresa()).toBe('Empresa B'));

    // Una empresa elegida a mano ya no se sustituye.
    await choose(user, /Empresa vinculada/, /Empresa C/);
    await choose(user, /Publicación de origen/, /Reto de ejemplo/);
    await waitFor(() => expect(getChallengeApplicants).toHaveBeenCalledTimes(3));
    expect(empresa()).toBe('Empresa C');
  });

  it('los errores de año y periodo desaparecen al corregir el campo', async () => {
    mockBaseCatalogs();
    const user = userEvent.setup();

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');
    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await choose(user, /Publicación de origen/, /Reto de ejemplo/);
    await waitFor(() => expect(getUserById).toHaveBeenCalled());
    await choose(user, /Postulación del estudiante/, /Ana Pérez/);

    await user.type(screen.getByLabelText('Año académico'), '26');
    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));
    expect(await screen.findByText(/Escribe un año de cuatro dígitos/)).toBeInTheDocument();
    expect(screen.getByText('Indica también el periodo.')).toBeInTheDocument();
    expect(screen.getByText('Revisa los 2 campos marcados antes de continuar.')).toBeInTheDocument();
    expect(screen.getByLabelText('Año académico')).toHaveFocus();

    await user.type(screen.getByLabelText('Año académico'), '26');
    expect(screen.queryByText(/Escribe un año de cuatro dígitos/)).not.toBeInTheDocument();
    expect(screen.queryByText('Indica también el periodo.')).not.toBeInTheDocument();
    expect(screen.queryByText(/campos marcados/)).not.toBeInTheDocument();
    expect(createPractica).not.toHaveBeenCalled();
  });

  it('exige seleccionar una interacción antes de formalizar', async () => {
    mockBaseCatalogs();
    const user = userEvent.setup();

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    expect(
      await screen.findByText('Selecciona la publicación de origen.')
    ).toBeInTheDocument();
    expect(createPractica).not.toHaveBeenCalled();
  });

  it('muestra el conflicto 409 del backend al duplicar una práctica', async () => {
    mockBaseCatalogs();
    createPractica.mockRejectedValue(
      new ApiError('Ya existe una practica formalizada para esta interaccion', 409)
    );
    const user = userEvent.setup();

    renderWithProviders(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await choose(user, 'Publicación de origen', /Reto de ejemplo/);
    await waitFor(() => expect(getUserById).toHaveBeenCalled());
    await choose(user, 'Postulación del estudiante', /Ana Pérez/);
    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    expect(
      await screen.findByText('Ya existe una practica formalizada para esta interaccion')
    ).toBeInTheDocument();
  });
});
