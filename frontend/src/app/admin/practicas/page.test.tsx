import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const {
  replaceMock,
  listPracticas,
  listEmpresas,
  listTutoresDocentes,
  getChallenges,
  getChallengeApplicants,
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
};

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
}

beforeEach(() => {
  replaceMock.mockReset();
  listPracticas.mockReset();
  listEmpresas.mockReset();
  listTutoresDocentes.mockReset();
  getChallenges.mockReset();
  getChallengeApplicants.mockReset();
  createPractica.mockReset();
  updatePractica.mockReset();
  clearToken.mockReset();
});

describe('AdminPracticasPage', () => {
  it('muestra el estado vacío del listado', async () => {
    mockBaseCatalogs();

    render(<AdminPracticasPage />);

    expect(await screen.findByText('No hay prácticas formalizadas.')).toBeInTheDocument();
  });

  it('deshabilita el selector de empresa y muestra el aviso cuando falla su carga', async () => {
    mockBaseCatalogs();
    listEmpresas.mockRejectedValue(new ApiError('Operación exclusiva del rol admin', 403));
    const user = userEvent.setup();

    render(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));

    expect(await screen.findByText('Operación exclusiva del rol admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Empresa vinculada')).toBeDisabled();
  });

  it('formaliza una práctica enviando solo la interacción seleccionada', async () => {
    mockBaseCatalogs();
    createPractica.mockResolvedValue({ id: 'p1' });
    const user = userEvent.setup();

    render(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await user.selectOptions(
      screen.getByLabelText('Publicación de origen'),
      CHALLENGE.id
    );

    const interactionSelect = await screen.findByLabelText('Interacción (postulación)');
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /11111111… · aprobado/ })).toBeInTheDocument()
    );
    await user.selectOptions(interactionSelect, INTERACTION.id);

    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    await waitFor(() => expect(createPractica).toHaveBeenCalled());
    const payload = createPractica.mock.calls[0][0];
    expect(payload.interaction_id).toBe('i1');
    expect(payload.challenge_id).toBeUndefined();
    expect(payload.solucionador_id).toBeUndefined();
  });

  it('exige seleccionar una interacción antes de formalizar', async () => {
    mockBaseCatalogs();
    const user = userEvent.setup();

    render(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    expect(
      await screen.findByText('Selecciona la interacción que respalda la práctica.')
    ).toBeInTheDocument();
    expect(createPractica).not.toHaveBeenCalled();
  });

  it('muestra el conflicto 409 del backend al duplicar una práctica', async () => {
    mockBaseCatalogs();
    createPractica.mockRejectedValue(
      new ApiError('Ya existe una practica formalizada para esta interaccion', 409)
    );
    const user = userEvent.setup();

    render(<AdminPracticasPage />);
    await screen.findByText('No hay prácticas formalizadas.');

    await user.click(screen.getByRole('button', { name: 'Nueva práctica' }));
    await user.selectOptions(screen.getByLabelText('Publicación de origen'), CHALLENGE.id);
    const interactionSelect = await screen.findByLabelText('Interacción (postulación)');
    await waitFor(() => expect(getChallengeApplicants).toHaveBeenCalledWith('c1'));
    await user.selectOptions(interactionSelect, INTERACTION.id);
    await user.click(screen.getByRole('button', { name: 'Formalizar práctica' }));

    expect(
      await screen.findByText('Ya existe una practica formalizada para esta interaccion')
    ).toBeInTheDocument();
  });
});
