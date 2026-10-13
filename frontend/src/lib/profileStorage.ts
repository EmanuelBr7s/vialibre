'use client';

import type { ExtendedProfile } from '@/types';

/**
 * Persistencia del módulo de perfil en el navegador.
 *
 * - Campos extendidos de la organización (cargo, enlaces, …) → localStorage.
 * - Imagen de avatar → IndexedDB, para no agotar la cuota de localStorage.
 *
 * El perfil profesional y la hoja de vida viven en el backend (auth-service)
 * para que las empresas puedan consultarlos.
 */

const DB_NAME = 'vialibre-profile-store';
const DB_VERSION = 1;
const STORE_NAME = 'blobs';

function extendedKey(userId: string): string {
  return `vialibre-extended-profile-${userId}`;
}

function blobKey(prefix: string, userId: string): string {
  return `${prefix}-${userId}`;
}

// ── IndexedDB (wrapper minimalista en promesas, sin dependencias) ──

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecord<T>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function putRecord(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteRecord(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Avatar ──

export async function saveAvatar(userId: string, blob: Blob): Promise<void> {
  await putRecord(blobKey('avatar', userId), blob);
}

export async function getAvatarBlob(userId: string): Promise<Blob | null> {
  return getRecord<Blob>(blobKey('avatar', userId));
}

export async function getAvatarBlobUrl(userId: string): Promise<string | null> {
  const blob = await getAvatarBlob(userId);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteAvatar(userId: string): Promise<void> {
  await deleteRecord(blobKey('avatar', userId));
}

// ── Perfil extendido (localStorage) ──

export function saveExtendedProfile(userId: string, profile: ExtendedProfile): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(extendedKey(userId), JSON.stringify(profile));
}

export function getExtendedProfile(userId: string): ExtendedProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(extendedKey(userId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExtendedProfile;
  } catch {
    return null;
  }
}

// ── Utilidades de formato ──

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}