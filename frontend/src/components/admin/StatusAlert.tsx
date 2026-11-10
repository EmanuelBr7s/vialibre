import type { ReactNode } from 'react';

interface StatusAlertProps {
  tone: 'success' | 'error' | 'info';
  children: ReactNode;
}

/** Inline feedback box used across the admin screens (aria-live friendly). */
export default function StatusAlert({ tone, children }: StatusAlertProps) {
  const role = tone === 'error' ? 'alert' : 'status';
  const toneClass = {
    success: 'text-green-700 bg-green-50 border-green-200',
    error: 'text-red-600 bg-red-50 border-red-200',
    info: 'text-primary-700 bg-primary-50 border-primary-200',
  }[tone];

  return (
    <div role={role} className={`text-sm rounded-lg p-3 border ${toneClass}`}>
      {children}
    </div>
  );
}
