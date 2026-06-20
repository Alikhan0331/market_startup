import { cn } from '../../../lib/utils';

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

function getColor(score: number) {
  if (score >= 75) return { ring: 'border-emerald-500/40', text: 'text-emerald-400', label: 'Excellent' };
  if (score >= 55) return { ring: 'border-[#4F6EF7]/40', text: 'text-[#4F6EF7]', label: 'Good' };
  if (score >= 35) return { ring: 'border-amber-500/40', text: 'text-amber-400', label: 'Fair' };
  return { ring: 'border-zinc-600', text: 'text-zinc-400', label: 'Low' };
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const { ring, text, label } = getColor(score);
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-md border px-2.5 py-1.5 min-w-[52px]',
        ring,
        className,
      )}
    >
      <span className={cn('text-base font-bold tabular-nums leading-none', text)}>{score}</span>
      <span className={cn('text-[10px] leading-none mt-0.5', text)}>{label}</span>
    </div>
  );
}
