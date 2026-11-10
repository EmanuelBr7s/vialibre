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
import { validateEmpresa, type EmpresaDraft, type FieldErrors } from '@/lib/adminValidation';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import type { Empresa, EmpresaCreate } from '@/types';

const LIMIT = 20;

type ActivaFilter = 'todas' | 'activas' | 'inactivas';

const EMPTY_DRAFT: EmpresaDraft = {
  nit: '',
  razon_social: '',
  sector: '',
  representante_legal: '',
  contacto_email: '',
  contacto_telefono: '',
  publicador_user_id: '',
  activa: true,
};

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toDraft(empresa: Empresa): EmpresaDraft {
  return {
    nit: empresa.nit ?? '',
    razon_social: empresa.razon_social ?? '',
    sector: empresa.sector ?? '',
    representante_legal: empresa.representante_legal ?? '',
    contacto_email: empresa.contacto_email ?? '',
    contacto_telefono: empresa.contacto_telefono ?? '',
    publicador_user_id: empresa.publicador_user_id ?? '',
    activa: empresa.activa,
  };
}

function toPayload(draft: EmpresaDraft): EmpresaCreate {
  return {
    nit: orNull(draft.nit),
    razon_social: orNull(draft.razon_social),
    sector: orNull(draft.sector),
    representante_legal: orNull(draft.representante_legal),
    contacto_email: orNull(draft.contacto_email),
    contacto_telefono: orNull(draft.contacto_telefono),
    publicador_user_id: orNull(draft.publicador_user_id),
    activa: draft.activa,
  };
}

export default function AdminEmpresasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Empresa[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [filter, setFilter] = useState<ActivaFilter>('todas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Empresa | null>(null);
  const [draft, setDraft] = useState<EmpresaDraft>(EMPTY_DRAFT);
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

  const activaParam = filter === 'todas' ? undefined : filter === 'activas';

  const load = useCallback(
    async (from: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listEmpresas({ activa: activaParam, skip: from, limit: LIMIT });
        setRows(res.empresas);
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
    [activaParam, handleUnauthorized]
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

  const openEdit = (empresa: Empresa) => {
    setEditing(empresa);
    setDraft(toDraft(empresa));
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

  const updateDraft = (patch: Partial<EmpresaDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateEmpresa(draft);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const payload = toPayload(draft);
      if (editing) {
        await api.updateEmpresa(editing.id, payload);
        setFeedback('Empresa actualizada correctamente.');
      } else {
        await api.createEmpresa(payload);
        setFeedback('Empresa registrada correctamente.');
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
      title="Empresas"
      subtitle="Registro institucional de las empresas colaboradoras de la plataforma."
    >
      <div className="space-y-6">
        <div aria-live="polite">
          {feedback ? <StatusAlert tone="success">{feedback}</StatusAlert> : null}
        </div>

        {formOpen ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar empresa' : 'Nueva empresa'}
              </h2>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
              {formError ? <StatusAlert tone="error">{formError}</StatusAlert> : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="empresa-nit"
                  label="NIT"
                  value={draft.nit}
                  maxLength={20}
                  onChange={(v) => updateDraft({ nit: v })}
                  error={fieldErrors.nit}
                />
                <TextField
                  id="empresa-razon-social"
                  label="Razón social"
                  value={draft.razon_social}
                  maxLength={255}
                  onChange={(v) => updateDraft({ razon_social: v })}
                  error={fieldErrors.razon_social}
                />
                <TextField
                  id="empresa-sector"
                  label="Sector"
                  value={draft.sector}
                  maxLength={100}
                  onChange={(v) => updateDraft({ sector: v })}
                  error={fieldErrors.sector}
                />
                <TextField
                  id="empresa-representante"
                  label="Representante legal"
                  value={draft.representante_legal}
                  maxLength={255}
                  onChange={(v) => updateDraft({ representante_legal: v })}
                  error={fieldErrors.representante_legal}
                />
                <TextField
                  id="empresa-contacto-email"
                  label="Correo de contacto"
                  type="email"
                  value={draft.contacto_email}
                  maxLength={255}
                  onChange={(v) => updateDraft({ contacto_email: v })}
                  error={fieldErrors.contacto_email}
                />
                <TextField
                  id="empresa-contacto-telefono"
                  label="Teléfono de contacto"
                  value={draft.contacto_telefono}
                  maxLength={50}
                  onChange={(v) => updateDraft({ contacto_telefono: v })}
                  error={fieldErrors.contacto_telefono}
                />
                <TextField
                  id="empresa-publicador"
                  label="Publicador vinculado (UUID)"
                  value={draft.publicador_user_id}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  onChange={(v) => updateDraft({ publicador_user_id: v })}
                  error={fieldErrors.publicador_user_id}
                />
                <div className="flex items-end">
                  <CheckboxField
                    id="empresa-activa"
                    label="Activa"
                    checked={draft.activa}
                    onChange={(v) => updateDraft({ activa: v })}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  {submitting ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar empresa'}
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
            <h2 className="text-lg font-semibold text-gray-900">Empresas registradas</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-activa" className="text-xs text-gray-500">
                  Estado
                </label>
                <select
                  id="filtro-activa"
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as ActivaFilter)}
                  className={`px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-gray-900 ${FOCUS_RING}`}
                >
                  <option value="todas">Todas</option>
                  <option value="activas">Activas</option>
                  <option value="inactivas">Inactivas</option>
                </select>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={`px-4 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Nueva empresa
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <StatusAlert tone="error">{error}</StatusAlert>
            </div>
          ) : loading ? (
            <ListSkeleton label="Cargando empresas" />
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No hay empresas registradas." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th scope="col" className="px-6 py-3">Empresa</th>
                    <th scope="col" className="px-6 py-3">NIT</th>
                    <th scope="col" className="px-6 py-3">Sector</th>
                    <th scope="col" className="px-6 py-3">Contacto</th>
                    <th scope="col" className="px-6 py-3">Estado</th>
                    <th scope="col" className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((empresa) => (
                    <tr key={empresa.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-gray-900">
                          {empresa.razon_social ?? 'Empresa sin razón social'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {empresa.representante_legal ?? '—'}
                        </p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{empresa.nit ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{empresa.sector ?? '—'}</td>
                      <td className="px-6 py-3">
                        <p className="text-gray-600">{empresa.contacto_email ?? '—'}</p>
                        <p className="text-xs text-gray-500">
                          {empresa.contacto_telefono ?? '—'}
                        </p>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            empresa.activa ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          <span
                            className={`inline-block w-2 h-2 rounded-full ${
                              empresa.activa ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            aria-hidden="true"
                          />
                          {empresa.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(empresa)}
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
