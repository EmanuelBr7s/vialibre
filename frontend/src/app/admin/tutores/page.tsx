'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import StatusAlert from '@/components/admin/StatusAlert';
import EmptyState from '@/components/admin/EmptyState';
import ListSkeleton from '@/components/admin/ListSkeleton';
import ListPagination from '@/components/admin/ListPagination';
import { CheckboxField, TextField } from '@/components/admin/FormField';
import { api } from '@/lib/api';
import { errorMessage, isStatus } from '@/lib/adminErrors';
import { validateTutor, type FieldErrors, type TutorDraft } from '@/lib/adminValidation';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import type { TutorDocente, TutorDocenteCreate } from '@/types';

const LIMIT = 20;

type ActivoFilter = 'todos' | 'activos' | 'inactivos';

const EMPTY_DRAFT: TutorDraft = {
  identificacion: '',
  nombres: '',
  apellidos: '',
  email: '',
  telefono: '',
  programa_academico: '',
  user_id: '',
  activo: true,
};

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toDraft(tutor: TutorDocente): TutorDraft {
  return {
    identificacion: tutor.identificacion ?? '',
    nombres: tutor.nombres ?? '',
    apellidos: tutor.apellidos ?? '',
    email: tutor.email ?? '',
    telefono: tutor.telefono ?? '',
    programa_academico: tutor.programa_academico ?? '',
    user_id: tutor.user_id ?? '',
    activo: tutor.activo,
  };
}

function toPayload(draft: TutorDraft): TutorDocenteCreate {
  return {
    identificacion: orNull(draft.identificacion),
    nombres: orNull(draft.nombres),
    apellidos: orNull(draft.apellidos),
    email: orNull(draft.email),
    telefono: orNull(draft.telefono),
    programa_academico: orNull(draft.programa_academico),
    user_id: orNull(draft.user_id),
    activo: draft.activo,
  };
}

function displayName(tutor: TutorDocente): string {
  const name = [tutor.nombres, tutor.apellidos].filter(Boolean).join(' ').trim();
  return name || tutor.email || 'Tutor sin nombre';
}

export default function AdminTutoresPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TutorDocente[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filter, setFilter] = useState<ActivoFilter>('todos');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TutorDocente | null>(null);
  const [draft, setDraft] = useState<TutorDraft>(EMPTY_DRAFT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 3000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const handleUnauthorized = useCallback(() => {
    api.clearToken();
    router.replace('/login');
  }, [router]);

  const activoParam = filter === 'todos' ? undefined : filter === 'activos';

  const load = useCallback(
    async (from: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listTutoresDocentes({
          activo: activoParam,
          skip: from,
          limit: LIMIT,
        });
        setRows(res.tutores);
        setTotal(res.total);
        setSkip(res.skip);
      } catch (err) {
        if (isStatus(err, 401)) {
          handleUnauthorized();
          return;
        }
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [activoParam, handleUnauthorized]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (tutor: TutorDocente) => {
    setEditing(tutor);
    setDraft(toDraft(tutor));
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setFormError(null);
    setFieldErrors({});
  };

  const updateDraft = (patch: Partial<TutorDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateTutor(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = toPayload(draft);
      if (editing) {
        await api.updateTutorDocente(editing.id, payload);
        setFeedback('Tutor actualizado correctamente.');
      } else {
        await api.createTutorDocente(payload);
        setFeedback('Tutor registrado correctamente.');
      }
      const target = editing ? skip : 0;
      closeForm();
      await load(target);
    } catch (err) {
      if (isStatus(err, 401)) {
        handleUnauthorized();
        return;
      }
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell
      title="Tutores docentes"
      subtitle="Registro y mantenimiento de los tutores docentes vinculados al programa."
    >
      <div className="space-y-6">
        <div aria-live="polite">
          {feedback ? <StatusAlert tone="success">{feedback}</StatusAlert> : null}
        </div>

        {formOpen ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar tutor docente' : 'Nuevo tutor docente'}
              </h2>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
              {formError ? <StatusAlert tone="error">{formError}</StatusAlert> : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="tutor-identificacion"
                  label="Identificación"
                  value={draft.identificacion}
                  maxLength={20}
                  onChange={(v) => updateDraft({ identificacion: v })}
                  error={fieldErrors.identificacion}
                />
                <TextField
                  id="tutor-email"
                  label="Correo electrónico"
                  type="email"
                  value={draft.email}
                  maxLength={255}
                  onChange={(v) => updateDraft({ email: v })}
                  error={fieldErrors.email}
                />
                <TextField
                  id="tutor-nombres"
                  label="Nombres"
                  value={draft.nombres}
                  maxLength={255}
                  onChange={(v) => updateDraft({ nombres: v })}
                  error={fieldErrors.nombres}
                />
                <TextField
                  id="tutor-apellidos"
                  label="Apellidos"
                  value={draft.apellidos}
                  maxLength={255}
                  onChange={(v) => updateDraft({ apellidos: v })}
                  error={fieldErrors.apellidos}
                />
                <TextField
                  id="tutor-telefono"
                  label="Teléfono"
                  value={draft.telefono}
                  maxLength={50}
                  onChange={(v) => updateDraft({ telefono: v })}
                  error={fieldErrors.telefono}
                />
                <TextField
                  id="tutor-programa"
                  label="Programa académico"
                  value={draft.programa_academico}
                  maxLength={255}
                  onChange={(v) => updateDraft({ programa_academico: v })}
                  error={fieldErrors.programa_academico}
                />
                <TextField
                  id="tutor-user-id"
                  label="Usuario vinculado (UUID)"
                  value={draft.user_id}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  onChange={(v) => updateDraft({ user_id: v })}
                  error={fieldErrors.user_id}
                />
                <div className="flex items-end">
                  <CheckboxField
                    id="tutor-activo"
                    label="Activo"
                    checked={draft.activo}
                    onChange={(v) => updateDraft({ activo: v })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar tutor'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className={`px-5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tutores registrados</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-activo" className="text-xs text-gray-500">
                  Estado
                </label>
                <select
                  id="filtro-activo"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ActivoFilter)}
                  className={`px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-gray-900 ${FOCUS_RING}`}
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </select>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={`px-4 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Nuevo tutor
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <StatusAlert tone="error">{error}</StatusAlert>
            </div>
          ) : loading ? (
            <ListSkeleton label="Cargando tutores" />
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No hay tutores docentes registrados." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th scope="col" className="px-6 py-3">Tutor</th>
                    <th scope="col" className="px-6 py-3">Identificación</th>
                    <th scope="col" className="px-6 py-3">Programa</th>
                    <th scope="col" className="px-6 py-3">Usuario vinculado</th>
                    <th scope="col" className="px-6 py-3">Estado</th>
                    <th scope="col" className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((tutor) => (
                    <tr key={tutor.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">{displayName(tutor)}</p>
                        <p className="text-xs text-gray-500">{tutor.email ?? '—'}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{tutor.identificacion ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {tutor.programa_academico ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500 break-all">
                        {tutor.user_id ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            tutor.activo ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              tutor.activo ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            aria-hidden="true"
                          />
                          {tutor.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(tutor)}
                          className={`inline-flex items-center justify-center px-4 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && rows.length > 0 ? (
            <ListPagination skip={skip} limit={LIMIT} total={total} onChange={(s) => void load(s)} />
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
