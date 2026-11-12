import { beforeEach, describe, expect, it } from 'vitest';
import { mockApi } from '@/lib/mockApi';
import { ApiError, AUTH_COOKIE_NAME } from '@/lib/api';
import { MOCK_PRACTICAS } from '@/data/mock';

async function signInAs(email: string) {
  const { access_token } = await mockApi.login(email);
  document.cookie = `${AUTH_COOKIE_NAME}=${access_token}; path=/`;
}

async function expectStatus(promise: Promise<unknown>, status: number) {
  const error = await promise.catch((err: unknown) => err);
  expect(error).toBeInstanceOf(ApiError);
  expect((error as ApiError).status).toBe(status);
}

/** Storage en memoria: el modo mock persiste su base en localStorage entre llamadas. */
function installMemoryStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, String(value)),
    removeItem: (key: string) => void data.delete(key),
    clear: () => data.clear(),
    key: (index: number) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
  };
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

describe('mockApi · administración', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('restringe los endpoints de administración al rol admin (403)', async () => {
    await signInAs('leonardo@vialibre.edu.co');
    await expectStatus(mockApi.listTutoresDocentes(), 403);
    await expectStatus(mockApi.listEmpresas(), 403);
    await expectStatus(mockApi.listPracticas(), 403);
  });

  it('lista, filtra y pagina tutores sembrados', async () => {
    await signInAs('admin@vialibre.edu.co');
    const all = await mockApi.listTutoresDocentes();
    expect(all.total).toBe(2);
    const activos = await mockApi.listTutoresDocentes({ activo: true });
    expect(activos.tutores.every((t) => t.activo)).toBe(true);
    const page = await mockApi.listTutoresDocentes({ skip: 1, limit: 1 });
    expect(page.tutores).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it('crea y actualiza una empresa sin pisar booleanos con null', async () => {
    await signInAs('admin@vialibre.edu.co');
    const created = await mockApi.createEmpresa({ razon_social: 'Nueva SAS', nit: '900.000.001-1' });
    expect(created.activa).toBe(true);
    const updated = await mockApi.updateEmpresa(created.id, { sector: 'Agro', activa: null });
    expect(updated.sector).toBe('Agro');
    expect(updated.activa).toBe(true);
    expect((await mockApi.getEmpresa(created.id)).sector).toBe('Agro');
  });

  it('responde 409 al formalizar dos veces la misma interacción y 404 si no existe', async () => {
    await signInAs('admin@vialibre.edu.co');
    const existing = MOCK_PRACTICAS[0];
    await expectStatus(mockApi.createPractica({ interaction_id: existing.interaction_id }), 409);
    await expectStatus(mockApi.createPractica({ interaction_id: 'no-existe' }), 404);
    await expectStatus(mockApi.getTutorDocente('no-existe'), 404);
  });
});
