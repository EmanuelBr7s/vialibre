'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import StatusAlert from '@/components/admin/StatusAlert';
import EmptyState from '@/components/admin/EmptyState';
import ListSkeleton from '@/components/admin/ListSkeleton';
import ListPagination from '@/components/admin/ListPagination';
import {
  CheckboxField,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/admin/FormField';
import ReferenceSelect, {
  UNVERIFIED_REFERENCE_NOTICE,
  type ReferenceOption,
} from '@/components/admin/ReferenceSelect';
import ResponsiveList from '@/components/admin/ResponsiveList';
import Combobox from '@/components/ui/Combobox';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api';
import { errorMessage, isStatus } from '@/lib/adminErrors';
import {
  periodMismatchWarning,
  validatePractica,
  type FieldErrors,
  type PracticaDraft,
} from '@/lib/adminValidation';
import {
  ESTADOS_PRACTICA,
  INTERACTION_STATUS_LABEL,
  MODALIDADES_PRACTICA,
  PERIODOS_ACADEMICOS,
  TIPOS_PRACTICA,
  catalogLabel,
  periodoLabel,
} from '@/lib/catalogs';
import { MODULE_BY_ID } from '@/data/modules';
import {
  FOCUS_RING,
  TOUCH_TARGET,
  btnPrimary,
  btnSecondary,
  errorClass,
  hintClass,
  labelClass,
} from '@/components/ui/classes';
import type {
  Challenge,
  Empresa,
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

/** Orden de los campos en pantalla: el foco va al primero con error. */
const FIELD_IDS: Array<[string, string]> = [
  ['interaction', 'practica-interaction'],
  ['estado_administrativo', 'practica-estado'],
  ['modalidad', 'practica-modalidad'],
  ['tipo_practica', 'practica-tipo'],
  ['duracion_horas', 'practica-duracion'],
  ['fecha_inicio', 'practica-fecha-inicio'],
  ['fecha_fin', 'practica-fecha-fin'],
  ['anio_academico', 'practica-anio'],
  ['periodo_academico', 'practica-periodo'],
  ['observaciones_institucionales', 'practica-observaciones'],
];

interface StudentInfo {
  name: string;
  programa: string | null;
}

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

/** Campos del borrador que conservan el valor ya guardado. */
function unchangedFields(draft: PracticaDraft, original: PracticaDraft): Set<string> {
  return new Set(
    (Object.keys(draft) as Array<keyof PracticaDraft>).filter((key) => draft[key] === original[key])
  );
}

const shortId = (id: string) => `…${id.slice(-4)}`;

export default function AdminPracticasPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<Practica[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogos de referencia (solo lectura).
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaOptionsLoading, setEmpresaOptionsLoading] = useState(true);
  const [empresaOptionsError, setEmpresaOptionsError] = useState<string | null>(null);
  const [tutorOptions, setTutorOptions] = useState<ReferenceOption[]>([]);
  const [tutorOptionsLoading, setTutorOptionsLoading] = useState(true);
  const [tutorOptionsError, setTutorOptionsError] = useState<string | null>(null);

  // Catálogo de publicaciones e interacciones (para crear).
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [challengeError, setChallengeError] = useState<string | null>(null);
  const [interactionOptions, setInteractionOptions] = useState<Interaction[]>([]);
  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [formalizedIds, setFormalizedIds] = useState<Set<string>>(new Set());

  // Nombres de los estudiantes (se resuelven una vez por id).
  const [students, setStudents] = useState<Map<string, StudentInfo>>(new Map());
  const requestedStudents = useRef(new Set<string>());

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

  const handleUnauthorized = useCallback(() => {
    api.clearToken();
    router.replace('/login');
  }, [router]);

  const empresaOptions = useMemo<ReferenceOption[]>(
    () =>
      empresas.map((empresa) => ({
        value: empresa.id,
        label: empresa.razon_social ?? empresa.nit ?? `Empresa ${shortId(empresa.id)}`,
        description: empresa.razon_social && empresa.nit ? `NIT ${empresa.nit}` : undefined,
      })),
    [empresas]
  );

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

  const challengeById = useMemo(() => {
    const map = new Map<string, Challenge>();
    challenges.forEach((challenge) => map.set(challenge.id, challenge));
    return map;
  }, [challenges]);

  const challengeOptions = useMemo<ReferenceOption[]>(
    () =>
      challenges.map((challenge) => ({
        value: challenge.id,
        label: challenge.title,
        description: [MODULE_BY_ID[challenge.tipo]?.singular, challenge.empresa_nombre]
          .filter(Boolean)
          .join(' · '),
      })),
    [challenges]
  );

  // ── Nombres de estudiantes ──
  const resolveStudents = useCallback((ids: Array<string | null>) => {
    ids.forEach((id) => {
      if (!id || requestedStudents.current.has(id)) return;
      requestedStudents.current.add(id);
      api
        .getUserById(id)
        .then((user) =>
          setStudents((prev) =>
            new Map(prev).set(id, {
              name: user.full_name,
              programa: user.programa_academico ?? null,
            })
          )
        )
        .catch(() => {
          // Sin nombre disponible: se muestra el identificador abreviado.
        });
    });
  }, []);

  const studentName = (id: string | null) =>
    id ? students.get(id)?.name ?? `Estudiante ${shortId(id)}` : '—';

  useEffect(() => {
    resolveStudents(rows.map((row) => row.solucionador_id));
  }, [rows, resolveStudents]);

  useEffect(() => {
    resolveStudents(interactionOptions.map((interaction) => interaction.solucionador_id));
  }, [interactionOptions, resolveStudents]);

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
      setEmpresas(res.empresas);
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
            label: name || tutor.email || `Tutor ${shortId(tutor.id)}`,
            description: tutor.programa_academico ?? undefined,
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
      setChallenges(Array.from(map.values()));
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

    // La empresa que publicó la oferta se propone como empresa vinculada.
    const authorId = challengeById.get(id)?.author_id;
    const owner = empresas.find(
      (empresa) => empresa.publicador_user_id !== null && empresa.publicador_user_id === authorId
    );
    if (owner) setEmpresaId((current) => current ?? owner.id);

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

  const interactionComboOptions = availableInteractions.map((interaction) => ({
    value: interaction.id,
    label: studentName(interaction.solucionador_id),
    description: [
      students.get(interaction.solucionador_id)?.programa,
      INTERACTION_STATUS_LABEL[interaction.status] ?? interaction.status,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  const interactionPlaceholder = interactionLoading
    ? 'Cargando…'
    : !challengeId
    ? 'Selecciona primero una publicación'
    : availableInteractions.length === 0
    ? 'Sin postulaciones disponibles'
    : 'Selecciona una postulación';

  const resetForm = () => {
    setEmpresaId(null);
    setTutorId(null);
    setBilingue(false);
    setChallengeId('');
    setInteractionId('');
    setInteractionOptions([]);
    setInteractionError(null);
    setFieldErrors({});
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  };

  const openEdit = (practica: Practica) => {
    resetForm();
    setEditing(practica);
    setDraft(toDraft(practica));
    setEmpresaId(practica.empresa_id);
    setTutorId(practica.tutor_docente_id);
    setBilingue(practica.bilingue);
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

  const focusFirstError = (errors: FieldErrors) => {
    const first = FIELD_IDS.find(([field]) => errors[field]);
    if (!first) return;
    // Sin publicación elegida, el selector de postulación está deshabilitado.
    const targetId =
      first[0] === 'interaction' && !challengeId ? 'practica-challenge' : first[1];
    document.getElementById(targetId)?.focus();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const unchanged = editing ? unchangedFields(draft, toDraft(editing)) : new Set<string>();
    const errors = validatePractica(draft, unchanged);
    if (!editing && interactionId === '') {
      errors.interaction = 'Selecciona la postulación que respalda la práctica.';
    }
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors);
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        // Solo se envían los campos modificados: un valor antiguo fuera de
        // catálogo se conserva sin que el servidor lo rechace.
        const changed = Object.fromEntries(
          Object.entries(commonPayload(draft)).filter(([field]) => !unchanged.has(field))
        );
        const payload: PracticaUpdate = {
          ...changed,
          empresa_id: empresaId,
          tutor_docente_id: tutorId,
          bilingue,
        };
        await api.updatePractica(editing.id, payload);
        toast.success('Práctica actualizada correctamente.');
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
        toast.success('Práctica formalizada correctamente.');
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
    return map.get(id) ?? `${shortId(id)} (referencia no verificada)`;
  };

  const errorCount = Object.keys(fieldErrors).length;
  const derivedChallengeId = editing?.challenge_id ?? selectedInteraction?.challenge_id ?? null;
  const derivedStudentId = editing?.solucionador_id ?? selectedInteraction?.solucionador_id ?? null;
  const derivedStudent = derivedStudentId ? students.get(derivedStudentId) : undefined;

  return (
    <AdminShell
      title="Prácticas formalizadas"
      subtitle="Formalización y expediente administrativo de las prácticas profesionales."
    >
      <div className="space-y-6">
        {formOpen ? (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="text-fluid-lg font-semibold text-gray-900">
                {editing ? 'Editar práctica' : 'Formalizar nueva práctica'}
              </h2>
              {editing ? (
                <p className={hintClass}>
                  La postulación de origen no se puede cambiar una vez formalizada.
                </p>
              ) : null}
            </div>
            <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4" noValidate>
              {!editing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReferenceSelect
                    id="practica-challenge"
                    label="Publicación de origen"
                    options={challengeOptions}
                    value={challengeId === '' ? null : challengeId}
                    onChange={(value) => void onChallengeChange(value)}
                    loading={challengeLoading}
                    error={challengeError}
                    clearLabel="Selecciona una publicación"
                    emptyText="Aún no hay publicaciones."
                  />
                  <div>
                    <label htmlFor="practica-interaction" className={labelClass}>
                      Postulación del estudiante
                    </label>
                    <Combobox
                      id="practica-interaction"
                      options={interactionComboOptions}
                      value={interactionId}
                      onChange={setInteractionId}
                      placeholder={interactionPlaceholder}
                      disabled={interactionLoading || !challengeId || !!interactionError}
                      invalid={!!fieldErrors.interaction || !!interactionError}
                      describedBy={[
                        fieldErrors.interaction ? 'practica-interaction-error' : null,
                        interactionError ? 'practica-interaction-load-error' : 'practica-interaction-help',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                    {fieldErrors.interaction ? (
                      <p id="practica-interaction-error" role="alert" className={errorClass}>
                        {fieldErrors.interaction}
                      </p>
                    ) : null}
                    {interactionError ? (
                      <p id="practica-interaction-load-error" role="alert" className={errorClass}>
                        {interactionError}
                      </p>
                    ) : (
                      <p id="practica-interaction-help" className={hintClass}>
                        Solo se muestran postulaciones sin práctica formalizada.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {derivedStudentId ? (
                <dl className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-fluid-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <dt className="text-fluid-xs uppercase tracking-wider text-gray-500">Publicación</dt>
                    <dd className="font-medium text-gray-900 break-words" title={derivedChallengeId ?? undefined}>
                      {derivedChallengeId
                        ? challengeById.get(derivedChallengeId)?.title ?? `Publicación ${shortId(derivedChallengeId)}`
                        : '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-fluid-xs uppercase tracking-wider text-gray-500">Estudiante</dt>
                    <dd className="font-medium text-gray-900 break-words" title={derivedStudentId}>
                      {studentName(derivedStudentId)}
                    </dd>
                    {derivedStudent?.programa ? (
                      <dd className="text-fluid-xs text-gray-500">{derivedStudent.programa}</dd>
                    ) : null}
                  </div>
                </dl>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  id="practica-estado"
                  label="Estado administrativo"
                  value={draft.estado_administrativo}
                  options={ESTADOS_PRACTICA}
                  onChange={(v) => updateDraft({ estado_administrativo: v })}
                  error={fieldErrors.estado_administrativo}
                />
                <SelectField
                  id="practica-modalidad"
                  label="Modalidad"
                  value={draft.modalidad}
                  options={MODALIDADES_PRACTICA}
                  onChange={(v) => updateDraft({ modalidad: v })}
                  error={fieldErrors.modalidad}
                />
                <SelectField
                  id="practica-tipo"
                  label="Tipo de práctica"
                  value={draft.tipo_practica}
                  options={TIPOS_PRACTICA}
                  onChange={(v) => updateDraft({ tipo_practica: v })}
                  error={fieldErrors.tipo_practica}
                />
                <TextField
                  id="practica-duracion"
                  label="Duración (horas)"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={2000}
                  placeholder="480"
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
                  hint={periodMismatchWarning(draft)}
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
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="2026"
                  value={draft.anio_academico}
                  onChange={(v) => updateDraft({ anio_academico: v.replace(/\D/g, '') })}
                  error={fieldErrors.anio_academico}
                />
                <SelectField
                  id="practica-periodo"
                  label="Periodo académico"
                  value={draft.periodo_academico}
                  options={PERIODOS_ACADEMICOS}
                  onChange={(v) => updateDraft({ periodo_academico: v })}
                  error={fieldErrors.periodo_academico}
                />
              </div>

              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReferenceSelect
                    id="practica-empresa"
                    label="Empresa vinculada"
                    options={empresaOptions}
                    value={empresaId}
                    onChange={setEmpresaId}
                    loading={empresaOptionsLoading}
                    error={empresaOptionsError}
                    emptyText="Aún no hay empresas registradas."
                    emptyAction={{ href: '/admin/empresas', label: 'Registrar empresa' }}
                  />
                  <ReferenceSelect
                    id="practica-tutor"
                    label="Tutor docente vinculado"
                    options={tutorOptions}
                    value={tutorId}
                    onChange={setTutorId}
                    loading={tutorOptionsLoading}
                    error={tutorOptionsError}
                    emptyText="Aún no hay tutores registrados."
                    emptyAction={{ href: '/admin/tutores', label: 'Registrar tutor' }}
                  />
                </div>
                <p className="mt-2 text-fluid-xs text-amber-700">{UNVERIFIED_REFERENCE_NOTICE}</p>
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
                maxLength={2000}
                onChange={(v) => updateDraft({ observaciones_institucionales: v })}
                error={fieldErrors.observaciones_institucionales}
              />

              {/* Los avisos van junto a los botones: es donde está mirando quien envía. */}
              <div aria-live="polite">
                {formError ? (
                  <StatusAlert tone="error">{formError}</StatusAlert>
                ) : errorCount > 0 ? (
                  <StatusAlert tone="error">
                    {errorCount === 1
                      ? 'Revisa el campo marcado antes de continuar.'
                      : `Revisa los ${errorCount} campos marcados antes de continuar.`}
                  </StatusAlert>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  aria-busy={submitting}
                  className={`${btnPrimary} w-full sm:w-auto`}
                >
                  {submitting
                    ? editing
                      ? 'Guardando…'
                      : 'Formalizando…'
                    : editing
                    ? 'Guardar cambios'
                    : 'Formalizar práctica'}
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
            <h2 className="text-fluid-lg font-semibold text-gray-900">Prácticas registradas</h2>
            <div className="flex flex-col xs:flex-row xs:items-center gap-3">
              <div className="flex items-center gap-2">
                <label htmlFor="filtro-estado" className="text-fluid-xs text-gray-500 shrink-0">
                  Estado
                </label>
                <Select
                  id="filtro-estado"
                  value={estadoFilter}
                  onChange={(event) => setEstadoFilter(event.target.value)}
                  compact
                >
                  <option value="">Todos</option>
                  {ESTADOS_PRACTICA.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <button
                type="button"
                onClick={openCreate}
                className={`${btnPrimary} w-full sm:w-auto`}
              >
                Nueva práctica
              </button>
            </div>
          </div>

          {error ? (
            <div className="p-4 sm:p-6">
              <StatusAlert tone="error">{error}</StatusAlert>
            </div>
          ) : loading ? (
            <ListSkeleton label="Cargando prácticas" />
          ) : rows.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState message="No hay prácticas formalizadas." />
            </div>
          ) : (
            <ResponsiveList
              label="Prácticas registradas"
              rows={rows}
              rowKey={(row) => row.id}
              columns={[
                {
                  header: 'Estudiante',
                  kind: 'primary',
                  cell: (row) => (
                    <>
                      <p className="font-medium text-gray-900">{studentName(row.solucionador_id)}</p>
                      <p className="text-xs text-gray-500">
                        {row.challenge_id
                          ? challengeById.get(row.challenge_id)?.title ?? `Publicación ${shortId(row.challenge_id)}`
                          : '—'}
                      </p>
                    </>
                  ),
                },
                {
                  header: 'Empresa',
                  cell: (row) => renderReferenceLabel(row.empresa_id, empresaLabelById),
                },
                {
                  header: 'Tutor',
                  cell: (row) => renderReferenceLabel(row.tutor_docente_id, tutorLabelById),
                },
                {
                  header: 'Estado',
                  cell: (row) => (
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {row.estado_administrativo
                        ? catalogLabel(ESTADOS_PRACTICA, row.estado_administrativo)
                        : 'Sin estado'}
                    </span>
                  ),
                },
                {
                  header: 'Periodo',
                  cell: (row) => periodoLabel(row.anio_academico, row.periodo_academico),
                },
                {
                  header: 'Vigencia',
                  cell: (row) => (
                    <span className="text-xs text-gray-500">
                      <span className="block">{row.fecha_inicio ?? '—'}</span>
                      <span className="block">{row.fecha_fin ?? '—'}</span>
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
