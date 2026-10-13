'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import {
  deleteAvatar,
  getAvatarBlobUrl,
  getExtendedProfile,
  saveAvatar,
  saveExtendedProfile,
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
 * autenticado (AuthContext), la hoja de vida guardada en la API y los datos
 * extendidos persistidos localmente (profileStorage).
 */
export function useProfile(): UseProfileResult {
  const { user, syncUser } = useAuth();
  const userId = user?.id ?? null;
  const hasCv = !!user?.cv_filename;

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
      const ext = getExtendedProfile(userId);
      const [av, rv] = await Promise.all([
        getAvatarBlobUrl(userId).catch(() => null),
        hasCv ? api.getUserCvBlobUrl(userId).catch(() => null) : null,
      ]);
      if (cancelled) return;
      setExtended(ext);
      setAvatarUrl(av);
      setResumeUrl(rv);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
      revokeUrl(previousAvatar);
      revokeUrl(previousResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasCv]);

  // Metadatos del CV derivados del usuario autenticado (fuente: API).
  useEffect(() => {
    setResumeInfo(
      user?.cv_filename
        ? {
            id: user.cv_updated_at ?? user.cv_filename,
            fileName: user.cv_filename,
            size: user.cv_size ?? 0,
            updatedAt: user.cv_updated_at ?? '',
          }
        : null
    );
  }, [user?.cv_filename, user?.cv_size, user?.cv_updated_at]);

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
      const updated = await api.uploadMyCv(file);
      revokeUrl(resumeUrl);
      // El PDF recién subido se previsualiza sin volver a descargarlo.
      setResumeUrl(URL.createObjectURL(file));
      syncUser(updated);
    },
    [userId, resumeUrl, syncUser]
  );

  const removeResume = useCallback(
    async (disabled: boolean) => {
      if (!userId || !user || disabled) return;
      await api.deleteMyCv();
      revokeUrl(resumeUrl);
      setResumeUrl(null);
      syncUser({ ...user, cv_filename: null, cv_size: null, cv_updated_at: null });
    },
    [userId, user, resumeUrl, syncUser]
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