type MatchDeckLogoProps = {
  className?: string;
  wordmark?: boolean;
  stacked?: boolean;
};

export function MatchDeckLogo({ className = "", wordmark = false, stacked = false }: MatchDeckLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${stacked ? "flex-col gap-1 text-center" : ""} ${className}`}>
      <img src="/images/matchdeck-logo-only.png" alt="" className={`${stacked ? "h-20 w-auto max-w-[85%]" : "h-12 w-auto"} shrink-0 object-contain`} />
      {wordmark && <span className="font-display font-black leading-none text-white">MatchDeck</span>}
    </span>
  );
}
