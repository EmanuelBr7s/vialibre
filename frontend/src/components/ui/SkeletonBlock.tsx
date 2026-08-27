interface SkeletonBlockProps {
  className?: string;
}

/** Pulsing placeholder block used to build skeleton loaders. */
export default function SkeletonBlock({ className = '' }: SkeletonBlockProps) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} aria-hidden="true" />;
}
