'use client';

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { campaignsApi, CampaignMatchResult } from '../../../../lib/api/campaigns';
import { dealsApi } from '../../../../lib/api/deals';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { Button, buttonVariants } from '../../../../components/ui/button';
import { cn } from '../../../../lib/utils';
import { formatFollowers, formatER } from '../../../../lib/utils/formatters';
import { ArrowLeft, Target, Calendar, DollarSign, Globe, Sparkles, Send } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  DRAFT:     'bg-zinc-800 text-zinc-400',
  ACTIVE:    'bg-emerald-500/15 text-emerald-400',
  COMPLETED: 'bg-[#4F6EF7]/15 text-[#7B93FA]',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

function MiniBar({ score, max, color }: { score: number; max: number; color: string }) {
  return (
    <div className="h-1 flex-1 rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min((score / max) * 100, 100)}%` }} />
    </div>
  );
}

function MatchRow({ result, campaignId, campaignFormat, campaignDeadline, token }: {
  result: CampaignMatchResult;
  campaignId: string;
  campaignFormat: string;
  campaignDeadline: string;
  token: string;
}) {
  const { influencer, matchScore, breakdown } = result;
  const qc = useQueryClient();

  const scoreColor = matchScore >= 70 ? 'text-emerald-400' : matchScore >= 45 ? 'text-amber-400' : 'text-zinc-400';

  const topFollowers = Math.max(
    influencer.instagramFollowers ?? 0,
    influencer.tiktokFollowers ?? 0,
    influencer.youtubeSubscribers ?? 0,
  );

  const sendOffer = useMutation({
    mutationFn: () => dealsApi.create({
      influencerId: influencer.id,
      campaignId,
      budget: influencer.priceFrom ?? 0,
      format: campaignFormat as any,
      description: `Offer from campaign`,
      deadline: campaignDeadline,
    }, token),
    onSuccess: () => {
      toast.success(`Offer sent to ${influencer.displayName}`);
      qc.invalidateQueries({ queryKey: ['campaign', campaignId] });
    },
    onError: () => toast.error('Failed to send offer'),
  });

  return (
    <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors">
      {/* Score */}
      <div className="flex flex-col items-center w-12 shrink-0">
        <span className={`text-xl font-bold leading-none ${scoreColor}`}>{matchScore}</span>
        <span className="text-xs text-zinc-600">/ 100</span>
      </div>

      {/* Avatar + name */}
      <div className="flex items-center gap-3 w-44 shrink-0">
        <Avatar className="h-9 w-9 shrink-0">
          {influencer.avatarUrl && <AvatarImage src={influencer.avatarUrl} />}
          <AvatarFallback className="bg-[#4F6EF7]/20 text-[#4F6EF7] text-xs font-medium">
            {influencer.displayName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-100 truncate">{influencer.displayName}</p>
          <p className="text-xs text-zinc-500">{influencer.country ?? '—'}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex gap-4 text-center w-36 shrink-0">
        <div>
          <p className="text-sm font-semibold text-zinc-100">{formatFollowers(topFollowers)}</p>
          <p className="text-xs text-zinc-500">followers</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">{formatER(influencer.instagramER)}</p>
          <p className="text-xs text-zinc-500">ER</p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="flex-1 hidden md:block space-y-1.5">
        {[
          { label: 'Niche',   score: breakdown.nicheScore,   max: 30, color: 'bg-[#4F6EF7]' },
          { label: 'Geo',     score: breakdown.geoScore,     max: 20, color: 'bg-sky-500' },
          { label: 'Budget',  score: breakdown.budgetScore,  max: 25, color: 'bg-emerald-500' },
          { label: 'Format',  score: breakdown.formatScore,  max: 15, color: 'bg-violet-500' },
        ].map(({ label, score, max, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-12 text-xs text-zinc-600 shrink-0">{label}</span>
            <MiniBar score={score} max={max} color={color} />
            <span className="w-5 text-right text-xs text-zinc-600">{Math.round(score)}</span>
          </div>
        ))}
      </div>

      {/* Reasons */}
      <div className="flex-1 hidden lg:block">
        <ul className="space-y-0.5">
          {breakdown.reasons.slice(0, 3).map((r, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4F6EF7]" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <Link
          href={`/influencers/${influencer.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-zinc-700 text-zinc-400 hover:bg-zinc-800')}
        >
          View
        </Link>
        <Button
          size="sm"
          className="bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white gap-1"
          onClick={() => sendOffer.mutate()}
          disabled={sendOffer.isPending}
        >
          <Send className="h-3.5 w-3.5" />
          Offer
        </Button>
      </div>
    </div>
  );
}

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken as string;
  const qc = useQueryClient();

  const { data: campaign } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignsApi.getOne(id, token),
    enabled: !!token,
  });

  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['campaign-matches', id],
    queryFn: () => campaignsApi.getMatches(id, token, 40),
    enabled: !!token && !!campaign,
  });

  const activate = useMutation({
    mutationFn: () => campaignsApi.update(id, { status: 'ACTIVE' }, token),
    onSuccess: () => {
      toast.success('Campaign activated');
      qc.invalidateQueries({ queryKey: ['campaign', id] });
    },
  });

  if (!campaign) {
    return <div className="flex justify-center py-20 text-zinc-500 text-sm">Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/campaigns" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-zinc-400 mt-0.5')}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-zinc-100">{campaign.title}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[campaign.status]}`}>
              {campaign.status}
            </span>
            {campaign.isPublic && (
              <span className="rounded-full bg-[#4F6EF7]/15 px-2 py-0.5 text-xs text-[#7B93FA]">Public</span>
            )}
          </div>
          {campaign.description && (
            <p className="text-sm text-zinc-400 mt-1">{campaign.description}</p>
          )}
        </div>
        {campaign.status === 'DRAFT' && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            onClick={() => activate.mutate()}
            disabled={activate.isPending}
          >
            Activate
          </Button>
        )}
      </div>

      {/* Campaign meta */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
          <Target className="h-4 w-4 text-zinc-600" />
          {campaign.goal}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
          <DollarSign className="h-4 w-4 text-zinc-600" />
          ${campaign.budget.toLocaleString()}
        </div>
        {campaign.geo && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-300">
            <Globe className="h-4 w-4 text-zinc-600" />
            {campaign.geo}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-sm text-zinc-300">
          <Calendar className="h-4 w-4 text-zinc-600" />
          {new Date(campaign.deadline).toLocaleDateString()}
        </div>
        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">{campaign.format}</span>
      </div>

      {/* Matches */}
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#4F6EF7]" />
        <h2 className="text-sm font-medium text-zinc-300">
          Matched influencers
          {matches && <span className="ml-1.5 text-zinc-600">({matches.length})</span>}
        </h2>
      </div>

      {matchesLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : !matches?.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sparkles className="h-8 w-8 text-zinc-700 mb-3" />
          <p className="text-zinc-400 text-sm">No matches found</p>
          <p className="text-zinc-600 text-xs mt-1">Make sure your brand profile has industry and country filled in</p>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((r) => (
            <MatchRow
              key={r.influencer.id}
              result={r}
              campaignId={campaign.id}
              campaignFormat={campaign.format}
              campaignDeadline={campaign.deadline}
              token={token}
            />
          ))}
        </div>
      )}
    </div>
  );
}
