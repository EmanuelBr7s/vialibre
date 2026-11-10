// Shared UI class strings used across components for consistency (a11y, UX).

// Visible keyboard focus ring (WCAG 2.1 AA). Mirrors the requested blue-600 ring
// using the project's primary palette (primary-600 === #2563eb === blue-600).
export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

// Interactive controls should provide a comfortable touch target on mobile.
export const TOUCH_TARGET = 'min-h-[44px]';

// Field-level helper for accessible input focus (on all focus, incl. mouse).
export const INPUT_FOCUS =
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

// Field surface shared by text inputs and selects (border, radius, focus, background).
export const INPUT_SURFACE = `w-full rounded-lg border border-gray-300 ${INPUT_FOCUS} bg-white`;

export const inputClass = `${INPUT_SURFACE} px-4 py-3 text-gray-900`;
