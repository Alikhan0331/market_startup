import Link from 'next/link';
import { MatchResult } from '../../../lib/api/matching';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { buttonVariants } from '../../ui/button';
import { formatFollowers, formatER } from '../../../lib/utils/formatters';
import { cn } from '../../../lib/utils';

function MiniBar({ score, max, color }: { score: number; max: number; color: string }) {
  const pct = Math.min((score / max) * 100, 100);
  return (
    <div className="h-1 flex-1 rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

interface Props {
  result: MatchResult;
}

export function MatchCard({ result }: Props) {
  const { influencer, matchScore, breakdown } = result;

  const topFollowers = Math.max(
    influencer.instagramFollowers ?? 0,
    influencer.tiktokFollowers ?? 0,
    influencer.youtubeSubscribers ?? 0,
  );

  const scoreColor =
    matchScore >= 70 ? 'text-emerald-400' :
    matchScore >= 45 ? 'text-amber-400' :
    'text-zinc-400';

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors gap-3">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar className="h-10 w-10 shrink-0">
            {influencer.avatarUrl && <AvatarImage src={influencer.avatarUrl} />}
            <AvatarFallback className="bg-[#4F6EF7]/20 text-[#4F6EF7] text-sm font-medium">
              {influencer.displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{influencer.displayName}</p>
            <p className="text-xs text-zinc-500">{influencer.country ?? '—'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={`text-lg font-bold leading-none ${scoreColor}`}>{matchScore}</span>
          <span className="text-xs text-zinc-600">/ 100</span>
        </div>
      </div>

      {/* Matched categories */}
      {breakdown.matchedCategories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {breakdown.matchedCategories.slice(0, 3).map((cat) => (
            <span key={cat} className="rounded-full bg-[#4F6EF7]/15 px-2 py-0.5 text-xs text-[#7B93FA]">
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{formatFollowers(topFollowers)}</p>
          <p className="text-xs text-zinc-500">followers</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{formatER(influencer.instagramER)}</p>
          <p className="text-xs text-zinc-500">ER</p>
        </div>
      </div>

      {/* Score breakdown bars */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-zinc-600 shrink-0">Niche</span>
          <MiniBar score={breakdown.categoryScore} max={30} color="bg-[#4F6EF7]" />
          <span className="w-6 text-right text-xs text-zinc-600">{Math.round(breakdown.categoryScore)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-zinc-600 shrink-0">Geo</span>
          <MiniBar score={breakdown.countryScore} max={20} color="bg-sky-500" />
          <span className="w-6 text-right text-xs text-zinc-600">{Math.round(breakdown.countryScore)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-zinc-600 shrink-0">Quality</span>
          <MiniBar score={breakdown.engagementScore} max={25} color="bg-violet-500" />
          <span className="w-6 text-right text-xs text-zinc-600">{Math.round(breakdown.engagementScore)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-16 text-xs text-zinc-600 shrink-0">Budget</span>
          <MiniBar score={breakdown.budgetScore} max={15} color="bg-emerald-500" />
          <span className="w-6 text-right text-xs text-zinc-600">{Math.round(breakdown.budgetScore)}</span>
        </div>
      </div>

      {/* Reasons */}
      {breakdown.reasons.length > 0 && (
        <ul className="space-y-0.5">
          {breakdown.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F6EF7]" />
              {r}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/influencers/${influencer.id}`}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'mt-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
        )}
      >
        View Profile
      </Link>
    </div>
  );
}
