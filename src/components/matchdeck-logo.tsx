type MatchDeckLogoProps = {
  className?: string;
  wordmark?: boolean;
};

export function MatchDeckLogo({ className = "", wordmark = false }: MatchDeckLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" className="h-[1.5em] w-[1.5em] shrink-0">
        <rect x="10" y="7" width="22" height="30" rx="3" transform="rotate(-12 10 7)" stroke="currentColor" strokeWidth="3" />
        <rect x="17" y="11" width="22" height="30" rx="3" transform="rotate(12 17 11)" fill="currentColor" />
        <path d="M28 17l6 6-6 6-6-6 6-6z" fill="#9e1928" />
      </svg>
      {wordmark && <span>MatchDeck</span>}
    </span>
  );
}
