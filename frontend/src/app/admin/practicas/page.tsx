'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import StatusAlert from '@/components/admin/StatusAlert';
import EmptyState from '@/components/admin/EmptyState';
import ListSkeleton from '@/components/admin/ListSkeleton';
import ListPagination from '@/components/admin/ListPagination';
import { CheckboxField, TextAreaField, TextField } from '@/components/admin/FormField';
import ReferenceSelect, { type ReferenceOption } from '@/components/admin/ReferenceSelect';
import { api } from '@/lib/api';
import { errorMessage, isStatus } from '@/lib/adminErrors';
import {
  validatePractica,
  type FieldErrors,
  type PracticaDraft,
} from '@/lib/adminValidation';
import { FOCUS_RING, TOUCH_TARGET } from '@/components/ui/classes';
import type {
  Challenge,
  Interaction,
  Practica,
  PracticaCreate,
  PracticaUpdate,
} from '@/types';
import { ChallengeStatus } from '@/types';

const LIMIT = 20;
const OPTIONS_LIMIT = 100;
const CHALLENGE_STATUSES = Object.values(ChallengeStatus);

const EMPTY_DRAFT: PracticaDraft = {
  estado_administrativo: '',
  modalidad: '',
  tipo_practica: '',
  duracion_horas: '',
  fecha_inicio: '',
  fecha_fin: '',
  anio_academico: '',
  periodo_academico: '',
  observaciones_institucionales: '',
};

function orNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function toDraft(practica: Practica): PracticaDraft {
  return {
    estado_administrativo: practica.estado_administrativo ?? '',
    modalidad: practica.modalidad ?? '',
    tipo_practica: practica.tipo_practica ?? '',
    duracion_horas: practica.duracion_horas === null ? '' : String(practica.duracion_horas),
    fecha_inicio: practica.fecha_inicio ?? '',
    fecha_fin: practica.fecha_fin ?? '',
    anio_academico: practica.anio_academico ?? '',
    periodo_academico: practica.periodo_academico ?? '',
    observaciones_institucionales: practica.observaciones_institucionales ?? '',
  };
}

function commonPayload(draft: PracticaDraft) {
  return {
    estado_administrativo: orNull(draft.estado_administrativo),
    modalidad: orNull(draft.modalidad),
    tipo_practica: orNull(draft.tipo_practica),
    duracion_horas: draft.duracion_horas.trim() === '' ? null : Number(draft.duracion_horas),
    fecha_inicio: orNull(draft.fecha_inicio),
    fecha_fin: orNull(draft.fecha_fin),
    anio_academico: orNull(draft.anio_academico),
    periodo_academico: orNull(draft.periodo_academico),
    observaciones_institucionales: orNull(draft.observaciones_institucionales),
  };
}

export default function AdminPracticasPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Practica[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogos de referencia (solo lectura).
  const [empresaOptions, setEmpresaOptions] = useState<ReferenceOption[]>([]);
  const [empresaOptionsLoading, setEmpresaOptionsLoading] = useState(true);
  const [empresaOptionsError, setEmpresaOptionsError] = useState<string | null>(null);
  const [tutorOptions, setTutorOptions] = useState<ReferenceOption[]>([]);
  const [tutorOptionsLoading, setTutorOptionsLoading] = useState(true);
  const [tutorOptionsError, setTutorOptionsError] = useState<string | null>(null);

  // Catálogo de publicaciones e interacciones (para crear).
  const [challengeOptions, setChallengeOptions] = useState<ReferenceOption[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [interactionOptions, setInteractionOptions] = useState<Interaction[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [formalizedIds, setFormalizedIds] = useState<Set<string>>(new Set());

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Practica | null>(null);
  const [draft, setDraft] = useState<PracticaDraft>(EMPTY_DRAFT);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [tutorId, setTutorId] = useState<string | null>(null);
  const [bilingue, setBilingue] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [interactionId, setInteractionId] = useState('');
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

  const empresaLabelById = useMemo(() => {
    const map = new Map<string, string>();
    empresaOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [empresaOptions]);

  const tutorLabelById = useMemo(() => {
    const map = new Map<string, string>();
    tutorOptions.forEach((option) => map.set(option.value, option.label));
    return map;
  }, [tutorOptions]);

  // ── Listado principal ──
  const load = useCallback(
    async (from: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listPracticas({
          estado: orNull(estadoFilter) ?? undefined,
          skip: from,
          limit: LIMIT,
        });
        setRows(res.practicas);
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
    [estadoFilter, handleUnauthorized]
  );

  useEffect(() => {
    void load(0);
  }, [load]);

  // ── Catálogo de empresas (para asociar) ──
  const loadEmpresas = useCallback(async () => {
    setEmpresaOptionsLoading(true);
    setEmpresaOptionsError(null);
    try {
      const res = await api.listEmpresas({ skip: 0, limit: OPTIONS_LIMIT });
      setEmpresaOptions(
        res.empresas.map((empresa) => ({
          value: empresa.id,
          label:
            empresa.razon_social ??
            empresa.nit ??
            `${empresa.id.slice(0, 8)}…`,
        }))
      );
    } catch (err) {
      if (isStatus(err, 401)) {
        handleUnauthorized();
        return;
      }
      setEmpresaOptionsError(errorMessage(err));
    } finally {
      setEmpresaOptionsLoading(false);
    }
  }, [handleUnauthorized]);

  // ── Catálogo de tutores (para asociar) ──
  const loadTutores = useCallback(async () => {
    setTutorOptionsLoading(true);
    setTutorOptionsError(null);
    try {
      const res = await api.listTutoresDocentes({ skip: 0, limit: OPTIONS_LIMIT });
      setTutorOptions(
        res.tutores.map((tutor) => {
          const name = [tutor.nombres, tutor.apellidos].filter(Boolean).join(' ').trim();
          return {
            value: tutor.id,
            label: name || tutor.email || `${tutor.id.slice(0, 8)}…`,
          };
        })
      );
    } catch (err) {
      if (isStatus(err, 401)) {
        handleUnauthorized();
        return;
      }
      setTutorOptionsError(errorMessage(err));
    } finally {
      setTutorOptionsLoading(false);
    }
  }, [handleUnauthorized]);

  // ── Interacciones ya formalizadas (para no ofrecer duplicados) ──
  const loadFormalized = useCallback(async () => {
    try {
      const ids = new Set<string>();
      let from = 0;
      for (let page = 0; page < 10; page += 1) {
        const res = await api.listPracticas({ skip: from, limit: OPTIONS_LIMIT });
        res.practicas.forEach((practica) => ids.add(practica.interaction_id));
        from += res.practicas.length;
        if (res.practicas.length === 0 || from >= res.total) break;
      }
      setFormalizedIds(ids);
    } catch (err) {
      // No bloquea el formulario: el backend sigue rechazando duplicados con 409.
      if (isStatus(err, 401)) handleUnauthorized();
    }
  }, [handleUnauthorized]);

  // ── Catálogo de publicaciones (todos los estados) ──
  const loadChallenges = useCallback(async () => {
    setChallengeLoading(true);
    setChallengeError(null);
    try {
      const results = await Promise.all(
        CHALLENGE_STATUSES.map((statusFilter) =>
          api.getChallenges({ status: statusFilter, limit: OPTIONS_LIMIT })
        )
      );
      const map = new Map<string, Challenge>();
      results.forEach((res) => res.challenges.forEach((c) => map.set(c.id, c)));
      setChallengeOptions(
        Array.from(map.values()).map((c) => ({ value: c.id, label: `${c.title} (${c.tipo})` }))
      );
    } catch (err) {
      if (isStatus(err, 401)) {
        handleUnauthorized();
        return;
      }
      setChallengeError(errorMessage(err));
    } finally {
      setChallengeLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadEmpresas();
    void loadTutores();
    void loadChallenges();
    void loadFormalized();
  }, [loadEmpresas, loadTutores, loadChallenges, loadFormalized]);

  const onChallengeChange = async (id: string | null) => {
    setChallengeId(id ?? '');
    setInteractionId('');
    setInteractionOptions([]);
    setInteractionError(null);
    if (!id) return;
    setInteractionLoading(true);
    try {
      const res = await api.getChallengeApplicants(id);
      setInteractionOptions(res.interactions);
    } catch (err) {
      if (isStatus(err, 401)) {
        handleUnauthorized();
        return;
      }
      setInteractionError(errorMessage(err));
    } finally {
      setInteractionLoading(false);
    }
  };

  const availableInteractions = interactionOptions.filter(
    (interaction) => !formalizedIds.has(interaction.id)
  );
  const selectedInteraction =
    interactionOptions.find((interaction) => interaction.id === interactionId) ?? null;

  const openCreate = () => {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setEmpresaId(null);
    setTutorId(null);
    setBilingue(false);
    setChallengeId('');
    setInteractionId('');
    setInteractionOptions([]);
    setInteractionError(null);
    setFieldErrors({});
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (practica: Practica) => {
    setEditing(practica);
    setDraft(toDraft(practica));
    setEmpresaId(practica.empresa_id);
    setTutorId(practica.tutor_docente_id);
    setBilingue(practica.bilingue);
    setChallengeId('');
    setInteractionId('');
    setInteractionOptions([]);
    setInteractionError(null);
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

  const updateDraft = (patch: Partial<PracticaDraft>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validatePractica(draft);
    if (!editing && interactionId === '') {
      errors.interaction = 'Selecciona la interacción que respalda la práctica.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        const payload: PracticaUpdate = {
          ...commonPayload(draft),
          empresa_id: empresaId,
          tutor_docente_id: tutorId,
          bilingue,
        };
        await api.updatePractica(editing.id, payload);
        setFeedback('Práctica actualizada correctamente.');
      } else {
        // `challenge_id` y `solucionador_id` se derivan en el backend desde la
        // interacción; no se envían para que la autoridad sea el servidor.
        const payload: PracticaCreate = {
          ...commonPayload(draft),
          interaction_id: interactionId,
          empresa_id: empresaId,
          tutor_docente_id: tutorId,
          bilingue,
        };
        await api.createPractica(payload);
        setFeedback('Práctica formalizada correctamente.');
      }
      const target = editing ? skip : 0;
      closeForm();
      await Promise.all([load(target), loadFormalized()]);
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

  const renderReferenceLabel = (id: string | null, map: Map<string, string>) => {
    if (!id) return '—';
    return map.get(id) ?? `${id} (referencia no verificada)`;
  };

  return (
    <AdminShell
      title="Prácticas formalizadas"
      subtitle="Formalización y expediente administrativo de las prácticas profesionales."
    >
      <div className="space-y-6">
        <div aria-live="polite">
          {feedback ? <StatusAlert tone="success">{feedback}</StatusAlert> : null}
        </div>

        {formOpen ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editing ? 'Editar práctica' : 'Formalizar nueva práctica'}
              </h2>
              {editing ? (
                <p className="mt-1 text-xs text-gray-500">
                  La interacción de origen no se puede cambiar una vez formalizada.
                </p>
              ) : null}
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4" noValidate>
              {formError ? <StatusAlert tone="error">{formError}</StatusAlert> : null}

              {editing ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium text-gray-700">Interacción: </span>
                    <span className="break-all">{editing.interaction_id}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Publicación: </span>
                    <span className="break-all">{editing.challenge_id ?? '—'}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Estudiante: </span>
                    <span className="break-all">{editing.solucionador_id ?? '—'}</span>
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <ReferenceSelect
                      id="practica-challenge"
                      label="Publicación de origen"
                      options={challengeOptions}
                      value={challengeId === '' ? null : challengeId}
                      onChange={(value) => void onChallengeChange(value)}
                      loading={challengeLoading}
                      error={challengeError}
                    />
                    {fieldErrors.interaction ? (
                      <p role="alert" className="mt-1 text-xs text-red-600">
                        {fieldErrors.interaction}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label
                      htmlFor="practica-interaction"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Interacción (postulación)
                    </label>
                    <select
                      id="practica-interaction"
                      value={interactionId}
                      disabled={interactionLoading || !challengeId || !!interactionError}
                      onChange={(event) => setInteractionId(event.target.value)}
                      className={`w-full px-4 py-3 rounded-lg border border-gray-300 ${FOCUS_RING} bg-white text-gray-900 disabled:opacity-60 disabled:bg-gray-50`}
                    >
                      <option value="">
                        {interactionLoading
                          ? 'Cargando…'
                          : !challengeId
                          ? 'Selecciona primero una publicación'
                          : availableInteractions.length === 0
                          ? 'Sin interacciones disponibles'
                          : 'Selecciona una interacción'}
                      </option>
                      {availableInteractions.map((interaction) => (
                        <option key={interaction.id} value={interaction.id}>
                          {`${interaction.solucionador_id.slice(0, 8)}… · ${interaction.status}`}
                        </option>
                      ))}
                    </select>
                    {interactionError ? (
                      <p role="alert" className="mt-1 text-xs text-red-600">
                        {interactionError}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500">
                        Solo se muestran postulaciones sin práctica formalizada.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!editing && selectedInteraction ? (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium text-gray-700">Publicación (derivada): </span>
                    <span className="break-all">{selectedInteraction.challenge_id}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">Estudiante (derivado): </span>
                    <span className="break-all">{selectedInteraction.solucionador_id}</span>
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextField
                  id="practica-estado"
                  label="Estado administrativo"
                  value={draft.estado_administrativo}
                  maxLength={30}
                  placeholder="en_proceso, culminada…"
                  onChange={(v) => updateDraft({ estado_administrativo: v })}
                  error={fieldErrors.estado_administrativo}
                />
                <TextField
                  id="practica-modalidad"
                  label="Modalidad"
                  value={draft.modalidad}
                  maxLength={20}
                  placeholder="presencial, remoto, hibrido"
                  onChange={(v) => updateDraft({ modalidad: v })}
                  error={fieldErrors.modalidad}
                />
                <TextField
                  id="practica-tipo"
                  label="Tipo de práctica"
                  value={draft.tipo_practica}
                  maxLength={30}
                  onChange={(v) => updateDraft({ tipo_practica: v })}
                  error={fieldErrors.tipo_practica}
                />
                <TextField
                  id="practica-duracion"
                  label="Duración (horas)"
                  type="number"
                  value={draft.duracion_horas}
                  onChange={(v) => updateDraft({ duracion_horas: v })}
                  error={fieldErrors.duracion_horas}
                />
                <TextField
                  id="practica-fecha-inicio"
                  label="Fecha de inicio"
                  type="date"
                  value={draft.fecha_inicio}
                  onChange={(v) => updateDraft({ fecha_inicio: v })}
                  error={fieldErrors.fecha_inicio}
                />
                <TextField
                  id="practica-fecha-fin"
                  label="Fecha de fin"
                  type="date"
                  value={draft.fecha_fin}
                  onChange={(v) => updateDraft({ fecha_fin: v })}
                  error={fieldErrors.fecha_fin}
                />
                <TextField
                  id="practica-anio"
                  label="Año académico"
                  value={draft.anio_academico}
                  maxLength={10}
                  onChange={(v) => updateDraft({ anio_academico: v })}
                  error={fieldErrors.anio_academico}
                />
                <TextField
                  id="practica-periodo"
                  label="Periodo académico"
                  value={draft.periodo_academico}
                  maxLength={10}
                  onChange={(v) => updateDraft({ periodo_academico: v })}
                  error={fieldErrors.periodo_academico}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ReferenceSelect
                  id="practica-empresa"
                  label="Empresa vinculada"
                  options={empresaOptions}
                  value={empresaId}
                  onChange={setEmpresaId}
                  loading={empresaOptionsLoading}
                  error={empresaOptionsError}
                  notice
                />
                <ReferenceSelect
                  id="practica-tutor"
                  label="Tutor docente vinculado"
                  options={tutorOptions}
                  value={tutorId}
                  onChange={setTutorId}
                  loading={tutorOptionsLoading}
                  error={tutorOptionsError}
                  notice
                />
              </div>

              <CheckboxField
                id="practica-bilingue"
                label="Práctica bilingüe"
                checked={bilingue}
                onChange={setBilingue}
              />

              <TextAreaField
                id="practica-observaciones"
                label="Observaciones institucionales"
                value={draft.observaciones_institucionales}
                onChange={(v) => updateDraft({ observaciones_institucionales: v })}
                error={fieldErrors.observaciones_institucionales}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 ${TOUCH_TARGET} ${FOCUS_RING}`}
                >
                  {submitting
                    ? 'Guardando…'
                    : editing
                    ? 'Guardar cambios'
                    : 'Formalizar práctica'}
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
            <h2 className="text-lg font-semibold text-gray-900">Prácticas registradas</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-estado" className="text-xs text-gray-500">
                  Estado
                </label>
                <input
                  id="filtro-estado"
                  type="text"
                  value={estadoFilter}
                  placeholder="Todos"
                  maxLength={30}
                  onChange={(event) => setEstadoFilter(event.target.value)}
                  className={`px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white text-gray-900 ${FOCUS_RING}`}
                />
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={`px-4 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 ${TOUCH_TARGET} ${FOCUS_RING}`}
              >
                Nueva práctica
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-6">
              <StatusAlert tone="error">{error}</StatusAlert>
            </div>
          ) : loading ? (
            <ListSkeleton label="Cargando prácticas" />
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No hay prácticas formalizadas." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th scope="col" className="px-6 py-3">Interacción</th>
                    <th scope="col" className="px-6 py-3">Estudiante</th>
                    <th scope="col" className="px-6 py-3">Empresa</th>
                    <th scope="col" className="px-6 py-3">Tutor</th>
                    <th scope="col" className="px-6 py-3">Estado</th>
                    <th scope="col" className="px-6 py-3">Vigencia</th>
                    <th scope="col" className="px-6 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((practica) => (
                    <tr key={practica.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-6 py-3 text-xs text-gray-500 break-all">
                        {practica.interaction_id}
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500 break-all">
                        {practica.solucionador_id ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {renderReferenceLabel(practica.empresa_id, empresaLabelById)}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {renderReferenceLabel(practica.tutor_docente_id, tutorLabelById)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {practica.estado_administrativo ?? 'Sin estado'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-gray-500">
                        <p>{practica.fecha_inicio ?? '—'}</p>
                        <p>{practica.fecha_fin ?? '—'}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openEdit(practica)}
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
