// Shared UI class strings used across components for consistency (a11y, UX).

// Visible keyboard focus ring (WCAG 2.1 AA). Mirrors the requested blue-600 ring
// using the project's primary palette (primary-600 === #2563eb === blue-600).
export const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2';

// Interactive controls should provide a comfortable touch target on mobile.
export const TOUCH_TARGET = 'min-h-touch min-w-touch';
export const TOUCH_TARGET_LG = 'min-h-touch-lg min-w-touch-lg';

// Field-level helper for accessible input focus (on all focus, incl. mouse).
export const INPUT_FOCUS =
  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

// Input base: 16px minimum, padding cómodo, touch target
export const inputClass = `w-full px-4 py-3.5 rounded-lg border border-gray-300
  bg-white text-fluid-sm placeholder:text-gray-400
  ${INPUT_FOCUS}
  min-h-touch transition-colors`;

export const labelClass = 'block text-fluid-sm font-medium text-gray-700 mb-1.5';
export const errorClass = 'mt-1 text-fluid-xs text-red-600';
export const hintClass = 'mt-1 text-fluid-xs text-gray-500';

// Select nativo mobile-friendly
export const selectClass = `${inputClass} appearance-none bg-no-repeat bg-right pr-10
  bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")] bg-center`;

// Button base classes
export const btnPrimary = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING}`;
export const btnSecondary = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-60 transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING}`;
export const btnDanger = `inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-red-300 text-red-600 font-medium hover:bg-red-50 disabled:opacity-60 transition-colors ${TOUCH_TARGET_LG} ${FOCUS_RING}`;
export const btnGhost = `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-60 transition-colors ${TOUCH_TARGET} ${FOCUS_RING}`;

// Auth form specific
export const navLinkClass = (active: boolean) =>
  `flex-1 py-2 rounded-md text-sm font-medium transition ${TOUCH_TARGET} ${FOCUS_RING} ${
    active ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
  } inline-flex items-center justify-center`;

export const roleButtonClass = (active: boolean) =>
  `flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${TOUCH_TARGET} ${FOCUS_RING} ${
    active
      ? 'border-primary-500 bg-primary-50 text-primary-700'
      : 'border-gray-200 text-gray-500 hover:border-gray-300'
  }`;

// Card base
export const cardBase = 'bg-white rounded-xl border border-gray-200 shadow-sm';
export const cardHover = 'hover:shadow-md transition-shadow';