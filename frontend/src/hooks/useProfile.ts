'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  clearResumeMeta,
  deleteAvatar,
  deleteResume,
  getAvatarBlobUrl,
  getExtendedProfile,
  getResumeBlobUrl,
  getResumeMeta,
  saveAvatar,
  saveExtendedProfile,
  saveResume,
  saveResumeMeta,
} from '@/lib/profileStorage';
import type { ExtendedProfile, ResumeInfo } from '@/types';

function revokeUrl(url: string | null): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

export interface UseProfileResult {
  loading: boolean;
  extended: ExtendedProfile | null;
  avatarUrl: string | null;
  resumeInfo: ResumeInfo | null;
  resumeUrl: string | null;
  saveExtended: (profile: ExtendedProfile) => void;
  saveAvatarBlob: (blob: Blob) => Promise<void>;
  removeAvatar: (disabled: boolean) => Promise<void>;
  uploadResume: (file: File) => Promise<void>;
  removeResume: (disabled: boolean) => Promise<void>;
}

/**
 * Fuente de verdad cliente del módulo de perfil: combina el usuario
 * autenticado (AuthContext) con los datos extendidos y la hoja de vida
 * persistidos localmente (profileStorage).
 */
export function useProfile(): UseProfileResult {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [extended, setExtended] = useState<ExtendedProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [resumeInfo, setResumeInfo] = useState<ResumeInfo | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const previousAvatar = avatarUrl;
    const previousResume = resumeUrl;

    (async () => {
      try {
        const ext = getExtendedProfile(userId);
        const meta = getResumeMeta(userId);
        const [av, rv] = await Promise.all([
          getAvatarBlobUrl(userId),
          getResumeBlobUrl(userId),
        ]);
        if (cancelled) return;
        setExtended(ext);
        setAvatarUrl(av);
        setResumeInfo(meta);
        setResumeUrl(rv);
      } catch {
        // Almacenamiento local no disponible (p. ej. modo incógnito): se continúa sin datos extendidos.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revokeUrl(previousAvatar);
      revokeUrl(previousResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const saveExtended = useCallback(
    (profile: ExtendedProfile) => {
      if (!userId) return;
      saveExtendedProfile(userId, profile);
      setExtended(profile);
    },
    [userId]
  );

  const saveAvatarBlob = useCallback(
    async (blob: Blob) => {
      if (!userId) return;
      await saveAvatar(userId, blob);
      revokeUrl(avatarUrl);
      const url = await getAvatarBlobUrl(userId);
      setAvatarUrl(url);
    },
    [userId, avatarUrl]
  );

  const removeAvatar = useCallback(
    async (disabled: boolean) => {
      if (!userId || disabled) return;
      await deleteAvatar(userId);
      revokeUrl(avatarUrl);
      setAvatarUrl(null);
    },
    [userId, avatarUrl]
  );

  const uploadResume = useCallback(
    async (file: File) => {
      if (!userId) return;
      await saveResume(userId, file);
      const meta: ResumeInfo = {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`,
        fileName: file.name,
        size: file.size,
        updatedAt: new Date().toISOString(),
      };
      saveResumeMeta(userId, meta);
      revokeUrl(resumeUrl);
      const url = await getResumeBlobUrl(userId);
      setResumeInfo(meta);
      setResumeUrl(url);
    },
    [userId, resumeUrl]
  );

  const removeResume = useCallback(
    async (disabled: boolean) => {
      if (!userId || disabled) return;
      await deleteResume(userId);
      clearResumeMeta(userId);
      revokeUrl(resumeUrl);
      setResumeInfo(null);
      setResumeUrl(null);
    },
    [userId, resumeUrl]
  );

  return {
    loading,
    extended,
    avatarUrl,
    resumeInfo,
    resumeUrl,
    saveExtended,
    saveAvatarBlob,
    removeAvatar,
    uploadResume,
    removeResume,
  };
}