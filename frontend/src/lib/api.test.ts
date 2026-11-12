import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, apiRetry } from '@/lib/api';
import { ChallengeTipo } from '@/types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const fetchMock = vi.fn();

function lastCall(): [string, RequestInit] {
  const call = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return call as [string, RequestInit];
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  api.clearToken();
});

afterEach(() => {
  vi.unstubAllGlobals();
  api.clearToken();
});

describe('ApiError', () => {
  it('expone el código HTTP junto al mensaje', () => {
    const error = new ApiError('Conflicto', 409);
    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Conflicto');
  });
});

describe('métodos admin de tutores', () => {
  it('lista tutores con filtros y paginación en la query', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ tutores: [], total: 0, skip: 0, limit: 20 }));

    await api.listTutoresDocentes({ activo: true, skip: 0, limit: 20 });

    const [url, config] = lastCall();
    expect(url).toBe('/api/v1/auth/tutores-docentes?activo=true&skip=0&limit=20');
    expect(config.method).toBe('GET');
  });

  it('crea un tutor por POST con el cuerpo serializado', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'x' }, 201));

    await api.createTutorDocente({ nombres: 'Ana', activo: true });

    const [url, config] = lastCall();
    expect(url).toBe('/api/v1/auth/tutores-docentes');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body as string)).toEqual({ nombres: 'Ana', activo: true });
  });

  it('actualiza un tutor por PATCH sobre su id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'abc' }));

    await api.updateTutorDocente('abc', { activo: false });

    const [url, config] = lastCall();
    expect(url).toBe('/api/v1/auth/tutores-docentes/abc');
    expect(config.method).toBe('PATCH');
  });
});

describe('métodos admin de empresas', () => {
  it('lista empresas con el filtro activa', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ empresas: [], total: 0, skip: 0, limit: 20 }));

    await api.listEmpresas({ activa: false, limit: 50 });

    const [url] = lastCall();
    expect(url).toBe('/api/v1/core/empresas?activa=false&limit=50');
  });

  it('actualiza una empresa por PATCH', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'e1' }));

    await api.updateEmpresa('e1', { razon_social: 'ACME' });

    const [url, config] = lastCall();
    expect(url).toBe('/api/v1/core/empresas/e1');
    expect(config.method).toBe('PATCH');
  });
});

describe('métodos admin de prácticas', () => {
  it('omite el filtro estado cuando llega vacío', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ practicas: [], total: 0, skip: 0, limit: 20 }));

    await api.listPracticas({ estado: '', skip: 0, limit: 20 });

    const [url] = lastCall();
    expect(url).toBe('/api/v1/match/practicas?skip=0&limit=20');
  });

  it('formaliza una práctica por POST enviando solo interaction_id', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'p1' }, 201));

    await api.createPractica({ interaction_id: 'i1', empresa_id: null });

    const [url, config] = lastCall();
    expect(url).toBe('/api/v1/match/practicas');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body as string)).toEqual({
      interaction_id: 'i1',
      empresa_id: null,
    });
  });
});

describe('manejo de errores HTTP', () => {
  it('lanza ApiError 401 con el detail del backend', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'No autenticado' }, 401));

    await expect(api.listEmpresas()).rejects.toMatchObject({
      status: 401,
      message: 'No autenticado',
    });
  });

  it('lanza ApiError 403 (permisos)', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Operación exclusiva del rol admin' }, 403));

    await expect(api.listTutoresDocentes()).rejects.toMatchObject({ status: 403 });
  });

  it('lanza ApiError 409 (conflicto de práctica duplicada)', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: 'Ya existe una practica formalizada para esta interaccion' }, 409)
    );

    await expect(api.createPractica({ interaction_id: 'i1' })).rejects.toMatchObject({
      status: 409,
    });
  });

  it('une el array de errores de validación 422 en un solo mensaje', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { detail: [{ msg: 'fecha_fin no puede ser anterior a fecha_inicio' }, { msg: 'campo requerido' }] },
        422
      )
    );

    await expect(api.updatePractica('p1', { fecha_fin: '2020-01-01' })).rejects.toMatchObject({
      status: 422,
      message: 'fecha_fin no puede ser anterior a fecha_inicio; campo requerido',
    });
  });
});

describe('token de sesión', () => {
  it('adjunta el Authorization cuando hay token guardado', async () => {
    api.setToken('jwt-123');
    fetchMock.mockResolvedValue(jsonResponse({ empresas: [], total: 0, skip: 0, limit: 20 }));

    await api.listEmpresas();

    const [, config] = lastCall();
    expect((config.headers as Record<string, string>).Authorization).toBe('Bearer jwt-123');
  });
});

describe('errores sin JSON y reintentos', () => {
  const htmlResponse = (status: number) =>
    new Response('<html><body>Bad Gateway</body></html>', {
      status,
      headers: { 'Content-Type': 'text/html' },
    });

  beforeEach(() => {
    apiRetry.delaysMs = [0, 0];
  });

  afterEach(() => {
    apiRetry.delaysMs = [1000, 3000];
  });

  it('nunca muestra "Unknown error": un 502 en HTML avisa de que el servidor arranca', async () => {
    fetchMock.mockImplementation(async () => htmlResponse(502));

    const error = (await api.getChallenges().catch((err: unknown) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toBe('El servidor se está iniciando. Reintenta en unos segundos.');
    expect(error.message).not.toMatch(/unknown/i);
  });

  it('reintenta las lecturas (GET) y devuelve el resultado cuando el servidor despierta', async () => {
    fetchMock
      .mockImplementationOnce(async () => htmlResponse(503))
      .mockImplementationOnce(async () => {
        throw new TypeError('Failed to fetch');
      })
      .mockImplementationOnce(async () => jsonResponse({ challenges: [], total: 0, skip: 0, limit: 20 }));

    await expect(api.getChallenges()).resolves.toMatchObject({ total: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('no reintenta las escrituras (POST) para no duplicar la operación', async () => {
    fetchMock.mockImplementation(async () => htmlResponse(503));

    await expect(api.createPractica({ interaction_id: 'i1' })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('convierte un fallo de red en un mensaje claro', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(api.createEmpresa({ razon_social: 'X' })).rejects.toMatchObject({
      status: 0,
      message: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    });
  });

  it('traduce los errores de validación (422) del backend', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        {
          detail: [
            { msg: "String should match pattern '^(19|20)\d{2}$'" },
            { msg: "Input should be '1' or '2'" },
            { msg: 'Input should be greater than or equal to 1' },
          ],
        },
        422
      )
    );

    await expect(api.createPractica({ interaction_id: 'i1' })).rejects.toMatchObject({
      status: 422,
      message:
        'el formato no es válido; el valor no está entre las opciones permitidas; el número está fuera del rango permitido',
    });
  });

  it('traduce los mensajes en inglés del backend', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse({ detail: 'Only publicadores can create challenges' }, 403)
    );

    await expect(
      api.createChallenge({ title: 't', short_description: 's', long_description: 'l', tipo: ChallengeTipo.RETO })
    ).rejects.toMatchObject({ message: 'Solo las empresas y el administrador pueden publicar.' });
  });
});
