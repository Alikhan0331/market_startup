'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { matchingApi, MatchResult } from '../../../lib/api/matching';
import { MatchScoreBadge } from '../../../components/shared/MatchScoreBadge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { ScoreBadge } from '../../../components/shared/ScoreBadge';
import { formatFollowers, formatPrice, formatER } from '../../../lib/utils/formatters';
import Link from 'next/link';
import { buttonVariants } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { Sparkles, CheckCircle2, MapPin, Tag, DollarSign, TrendingUp, UserCircle2 } from 'lucide-react';

function ReasonIcon({ reason }: { reason: string }) {
  if (reason.includes('country') || reason.includes('region') || reason.includes('country'))
    return <MapPin className="h-3 w-3 shrink-0" />;
  if (reason.includes('Content') || reason.includes('industry'))
    return <Tag className="h-3 w-3 shrink-0" />;
  if (reason.includes('price') || reason.includes('pricing'))
    return <DollarSign className="h-3 w-3 shrink-0" />;
  if (reason.includes('score') || reason.includes('quality'))
    return <TrendingUp className="h-3 w-3 shrink-0" />;
  return <CheckCircle2 className="h-3 w-3 shrink-0" />;
}

function MatchCard({ result }: { result: MatchResult }) {
  const { influencer, matchScore, breakdown } = result;
  const topFollowers = Math.max(
    influencer.instagramFollowers ?? 0,
    influencer.tiktokFollowers ?? 0,
    influencer.youtubeSubscribers ?? 0,
  );

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {influencer.avatarUrl && <AvatarImage src={influencer.avatarUrl} />}
            <AvatarFallback className="bg-[#4F6EF7]/20 text-[#4F6EF7] text-sm font-medium">
              {(influencer.displayName ?? '?').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-100 truncate">{influencer.displayName}</p>
            <p className="text-xs text-zinc-500">{influencer.country ?? 'Unknown country'}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ScoreBadge score={influencer.overallScore} />
          <MatchScoreBadge score={matchScore} />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-center">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{topFollowers > 0 ? formatFollowers(topFollowers) : '—'}</p>
          <p className="text-xs text-zinc-500">followers</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{influencer.instagramER ? formatER(influencer.instagramER) : '—'}</p>
          <p className="text-xs text-zinc-500">ER</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {influencer.priceFrom ? formatPrice(influencer.priceFrom) : '—'}
          </p>
          <p className="text-xs text-zinc-500">from</p>
        </div>
      </div>

      {/* Match reasons */}
      {breakdown.reasons.length > 0 && (
        <div className="flex flex-col gap-1 mb-3">
          {breakdown.reasons.slice(0, 3).map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-zinc-400">
              <ReasonIcon reason={r} />
              <span className="truncate">{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Score breakdown bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-zinc-600 mb-1">
          <span>Match breakdown</span>
          <span>{matchScore}/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4F6EF7] to-emerald-500 transition-all"
            style={{ width: `${Math.min(matchScore, 100)}%` }}
          />
        </div>
        <div className="flex gap-1 flex-wrap mt-1.5">
          {breakdown.categoryScore > 0 && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              cat +{Math.round(breakdown.categoryScore)}
            </span>
          )}
          {breakdown.countryScore > 0 && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              geo +{Math.round(breakdown.countryScore)}
            </span>
          )}
          {breakdown.engagementScore > 0 && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              quality +{Math.round(breakdown.engagementScore)}
            </span>
          )}
          {breakdown.budgetScore > 0 && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              budget +{Math.round(breakdown.budgetScore)}
            </span>
          )}
          {breakdown.verificationScore > 0 && (
            <span className="text-[10px] rounded-full bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              verified +{Math.round(breakdown.verificationScore)}
            </span>
          )}
        </div>
      </div>

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

export default function RecommendedPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken as string | undefined;

  const { data, isLoading, error } = useQuery({
    queryKey: ['recommended', token],
    queryFn: () => matchingApi.getRecommended(20, token),
    enabled: !!token,
    retry: false,
  });

  // Determine helpful error message based on status code
  const errorCode = (error as any)?.statusCode;
  const errorMessage =
    errorCode === 404
      ? "You don't have a brand profile yet. Go to Profile and save your details first."
      : errorCode === 403
      ? 'This page is only available for brand accounts.'
      : 'Failed to load recommendations. Please try again.';

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#4F6EF7]" />
            <h1 className="text-lg font-semibold text-zinc-100">Recommended</h1>
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">
            Influencers ranked by compatibility with your brand profile
          </p>
        </div>
        {data && (
          <span className="text-sm text-zinc-500">{data.length} matches</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
        <p className="text-xs text-zinc-500 shrink-0">Match score:</p>
        <div className="flex gap-3 flex-wrap">
          {[
            { range: '75–100', color: 'text-emerald-400', label: 'Excellent' },
            { range: '55–74',  color: 'text-[#4F6EF7]',   label: 'Good' },
            { range: '35–54',  color: 'text-amber-400',    label: 'Fair' },
            { range: '0–34',   color: 'text-zinc-400',     label: 'Low' },
          ].map(({ range, color, label }) => (
            <div key={range} className="flex items-center gap-1">
              <span className={cn('text-xs font-semibold', color)}>{range}</span>
              <span className="text-xs text-zinc-600">— {label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <UserCircle2 className="h-10 w-10 text-zinc-600" />
          <p className="text-lg font-medium text-zinc-300">Unable to load recommendations</p>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm">{errorMessage}</p>
          {errorCode === 404 && (
            <Link href="/profile" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-zinc-700 text-zinc-300 mt-2')}>
              Go to Profile
            </Link>
          )}
        </div>
      ) : data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="h-8 w-8 text-zinc-600 mb-3" />
          <p className="text-lg font-medium text-zinc-300">No influencers found</p>
          <p className="text-sm text-zinc-500 mt-1">No influencer profiles exist yet. Check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.map((result) => (
            <MatchCard key={result.influencer.id} result={result} />
          ))}
        </div>
      )}
    </div>
  );
}
