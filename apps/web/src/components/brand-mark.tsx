export function BrandMark({
  className = 'wordmark-mark',
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M29 7H15a8 8 0 0 0-8 8v18a8 8 0 0 0 8 8h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <circle cx="29" cy="24" r="4" fill="var(--brand-pulse, #f16632)" />
      <circle cx="39" cy="24" r="4" fill="var(--brand-pulse, #f16632)" />
    </svg>
  );
}
