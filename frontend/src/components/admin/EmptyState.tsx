import type { ReactNode } from 'react';

interface EmptyStateProps {
  message: string;
  children?: ReactNode;
}

/** Dashed empty-state box used when a list has no records. */
export default function EmptyState({ message, children }: EmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 sm:p-8 text-center">
      <p className="text-fluid-sm text-gray-600">{message}</p>
      {children}
    </div>
  );
}
