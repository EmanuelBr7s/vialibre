import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { getChallenges } = vi.hoisted(() => ({ getChallenges: vi.fn() }));

vi.mock('next/navigation', () => {
  const router = { replace: vi.fn(), push: vi.fn() };
  return { useRouter: () => router };
});
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, loading: false, user: { id: 'u1', role: 'publicador' } }),
}));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside aria-label="sidebar" /> }));
vi.mock('@/components/CreateChallengeModal', () => ({ default: () => null }));
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...actual, default: { getChallenges }, api: { getChallenges } };
});

import { ApiError } from '@/lib/api';
import FeedPage from '@/app/feed/page';

function challenge(id: string, tipo: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Publicación ${id}`,
    short_description: 'Descripción corta',
    long_description: 'Descripción larga',
    tipo,
    author_id: 'a1',
    status: 'abierto',
    is_featured: false,
    featured_score: 0,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

function respond(list: unknown[]) {
  return { challenges: list, total: list.length, skip: 0, limit: 100 };
}

beforeEach(() => {
  getChallenges.mockReset();
});

describe('FeedPage', () => {
  it('pide cada módulo una sola vez y saca las destacadas de la misma lista', async () => {
    getChallenges.mockResolvedValue(
      respond([challenge('r1', 'reto', { is_featured: true }), challenge('r2', 'reto')])
    );

    render(<FeedPage />);

    expect((await screen.findAllByText('Publicación r1')).length).toBeGreaterThan(0);
    expect(screen.getByText('Publicación r2')).toBeInTheDocument();
    expect(getChallenges).toHaveBeenCalledTimes(1);
    expect(getChallenges).toHaveBeenCalledWith({ limit: 100, tipo: 'reto' });
  });

  it('al volver a una pestaña muestra lo ya cargado mientras refresca', async () => {
    const user = userEvent.setup();
    getChallenges.mockImplementation(async ({ tipo }: { tipo: string }) =>
      respond([challenge(`${tipo}-1`, tipo)])
    );

    render(<FeedPage />);
    await screen.findByText('Publicación reto-1');

    await user.click(screen.getByRole('tab', { name: /práctica/i }));
    await screen.findByText('Publicación practica-1');

    // La vuelta a «retos» tarda: lo guardado se ve de inmediato, sin esqueletos.
    let release: (value: unknown) => void = () => {};
    getChallenges.mockImplementationOnce(() => new Promise((resolve) => (release = resolve)));
    await user.click(screen.getByRole('tab', { name: /reto/i }));
    expect(screen.getByText('Publicación reto-1')).toBeInTheDocument();

    release(respond([challenge('reto-1', 'reto'), challenge('reto-2', 'reto')]));
    expect(await screen.findByText('Publicación reto-2')).toBeInTheDocument();
    expect(getChallenges).toHaveBeenCalledTimes(3);
  });

  it('si la carga falla muestra el mensaje y permite reintentar', async () => {
    const user = userEvent.setup();
    getChallenges.mockRejectedValueOnce(
      new ApiError('El servidor se está iniciando. Reintenta en unos segundos.', 503)
    );
    getChallenges.mockResolvedValue(respond([challenge('r1', 'reto')]));

    render(<FeedPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor se está iniciando');
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Publicación r1')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});
