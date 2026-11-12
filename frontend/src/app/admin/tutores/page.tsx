'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import FormErrors from '@/components/admin/FormErrors';
import StatusAlert from '@/components/admin/StatusAlert';
import EmptyState from '@/components/admin/EmptyState';
import ListSkeleton from '@/components/admin/ListSkeleton';
import ListPagination from '@/components/admin/ListPagination';
import { CheckboxField, TextField } from '@/components/admin/FormField';
import { api } from '@/lib/api';
import { errorMessage, focusFirstError, isStatus } from '@/lib/adminErrors';
import { validateTutor, type FieldErrors, type TutorDraft } from '@/lib/adminValidation';
import ResponsiveList from '@/components/admin/ResponsiveList';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { FOCUS_RING, TOUCH_TARGET, btnPrimary, btnSecondary } from '@/components/ui/classes';
import type { TutorDocente, TutorDocenteCreate } from '@/types';

const LIMIT = 20;

/** Orden de los campos en pantalla: el foco va al primero con error. */
const FIELD_IDS: Array<[string, string]> = [
  ['identificacion', 'tutor-identificacion'],
  ['email', 'tutor-email'],
  ['nombres', 'tutor-nombres'],
  ['apellidos', 'tutor-apellidos'],
  ['telefono', 'tutor-telefono'],
  ['programa_academico', 'tutor-programa'],
  ['user_id', 'tutor-user-id'],
];

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
  const toast = useToast();
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
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors, FIELD_IDS);
      return;
    }

    setSubmitting(true);
    try {
      const payload = toPayload(draft);
      if (editing) {
        await api.updateTutorDocente(editing.id, payload);
        toast.success('Tutor actualizado correctamente.');
      } else {
        await api.createTutorDocente(payload);
        toast.success('Tutor registrado correctamente.');
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
        {formOpen ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-fluid-lg font-semibold text-gray-900">
                {editing ? 'Editar tutor docente' : 'Nuevo tutor docente'}
              </h2>
            </div>
            <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4" noValidate>
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

              {/* Los avisos van junto a los botones: es donde está mirando quien envía. */}
              <FormErrors formError={formError} fieldErrors={fieldErrors} />

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar tutor'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className={`${btnSecondary} w-full sm:w-auto`}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-fluid-lg font-semibold text-gray-900">Tutores registrados</h2>
            <div className="flex flex-col xs:flex-row xs:items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-activo" className="text-fluid-xs text-gray-500 shrink-0">
                  Estado
                </label>
                <Select
                  id="filtro-activo"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ActivoFilter)}
                  compact
                >
                  <option value="todos">Todos</option>
                  <option value="activos">Activos</option>
                  <option value="inactivos">Inactivos</option>
                </Select>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Nuevo tutor
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-4 sm:p-6">
              <StatusAlert tone="error">{error}</StatusAlert>
            </div>
          ) : loading ? (
            <ListSkeleton label="Cargando tutores" />
          ) : rows.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState message="No hay tutores docentes registrados." />
            </div>
          ) : (
            <ResponsiveList
              label="Tutores registrados"
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                {
                  header: 'Tutor',
                  kind: 'primary',
                  cell: (row) => (
                    <>
                      <p className="font-medium text-gray-900">{displayName(row)}</p>
                      <p className="text-xs text-gray-500">{row.email ?? '—'}</p>
                    </>
                  ),
                },
                { header: 'Identificación', cell: (row) => row.identificacion ?? '—' },
                { header: 'Programa', cell: (row) => row.programa_academico ?? '—' },
                {
                  header: 'Usuario vinculado',
                  cell: (row) => <span className="text-xs text-gray-500 break-all">{row.user_id ?? '—'}</span>,
                },
                {
                  header: 'Estado',
                  cell: (row) => (
                    <span
                      className={`inline-flex items-center gap-1.5 lg:text-xs font-medium ${
                        row.activo ? 'text-green-700' : 'text-red-600'
                      }`}
                    >
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          row.activo ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        aria-hidden="true"
                      />
                      {row.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  ),
                },
                {
                  header: 'Acción',
                  kind: 'action',
                  cell: (row) => (
                    <button
                      type="button"
                      onClick={() => openEdit(row)}
                      className={`inline-flex items-center justify-center px-4 rounded-lg text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                    >
                      Editar
                    </button>
                  ),
                  cardCell: (row) => (
                    <button type="button" onClick={() => openEdit(row)} className={`${btnSecondary} w-full`}>
                      Editar
                    </button>
                  ),
                },
              ]}
            />
          )}

          {!loading && !error && rows.length > 0 ? (
            <ListPagination skip={skip} limit={LIMIT} total={total} onChange={(s) => void load(s)} />
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
