'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { campaignsApi, Campaign, CampaignStatus } from '../../../lib/api/campaigns';
import { Button, buttonVariants } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import { Plus, Target, Calendar, DollarSign, Globe } from 'lucide-react';

const GOAL_LABEL = { REACH: 'Reach', SALES: 'Sales', AWARENESS: 'Awareness' };
const FORMAT_LABEL = { STORY: 'Story', REEL: 'Reel', POST: 'Post', VIDEO: 'Video', INTEGRATION: 'Integration' };

const STATUS_STYLE: Record<CampaignStatus, string> = {
  DRAFT:     'bg-zinc-800 text-zinc-400',
  ACTIVE:    'bg-emerald-500/15 text-emerald-400',
  COMPLETED: 'bg-[#4F6EF7]/15 text-[#7B93FA]',
  CANCELLED: 'bg-red-500/15 text-red-400',
};

function CampaignCard({ campaign, token, onDeleted }: { campaign: Campaign; token: string; onDeleted: () => void }) {
  const qc = useQueryClient();

  const activate = useMutation({
    mutationFn: () => campaignsApi.update(campaign.id, { status: 'ACTIVE' }, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const remove = useMutation({
    mutationFn: () => campaignsApi.remove(campaign.id, token),
    onSuccess: onDeleted,
  });

  return (
    <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-5 gap-4 hover:border-zinc-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{campaign.title}</p>
          {campaign.description && (
            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{campaign.description}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[campaign.status]}`}>
          {campaign.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Target className="h-3.5 w-3.5 text-zinc-600" />
          {GOAL_LABEL[campaign.goal]}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <DollarSign className="h-3.5 w-3.5 text-zinc-600" />
          ${campaign.budget.toLocaleString()}
        </div>
        {campaign.geo && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Globe className="h-3.5 w-3.5 text-zinc-600" />
            {campaign.geo}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <Calendar className="h-3.5 w-3.5 text-zinc-600" />
          {new Date(campaign.deadline).toLocaleDateString()}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
          {FORMAT_LABEL[campaign.format]}
        </span>
        {campaign.isPublic && (
          <span className="rounded-full bg-[#4F6EF7]/15 px-2 py-0.5 text-xs text-[#7B93FA]">Public</span>
        )}
      </div>

      <div className="flex gap-2 mt-auto pt-2 border-t border-zinc-800">
        <Link
          href={`/campaigns/${campaign.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800')}
        >
          View matches
        </Link>
        {campaign.status === 'DRAFT' && (
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => activate.mutate()}
            disabled={activate.isPending}
          >
            Activate
          </Button>
        )}
        {campaign.status === 'DRAFT' && (
          <Button
            size="sm"
            variant="outline"
            className="border-zinc-700 text-red-400 hover:bg-red-500/10"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const qc = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignsApi.list(token),
    enabled: !!token && role === 'BRAND',
  });

  if (role && role !== 'BRAND') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-medium text-zinc-300">Access restricted</p>
        <p className="text-sm text-zinc-500 mt-1">Only brands can manage campaigns</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Campaigns</h1>
          <p className="text-sm text-zinc-500">Your advertising tasks</p>
        </div>
        <Link
          href="/campaigns/new"
          className={cn(buttonVariants({ size: 'sm' }), 'bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white gap-1.5')}
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-52 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse" />
          ))}
        </div>
      ) : !campaigns?.length ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Target className="h-10 w-10 text-zinc-700 mb-3" />
          <p className="text-base font-medium text-zinc-300">No campaigns yet</p>
          <p className="text-sm text-zinc-500 mt-1">Create your first campaign to start finding influencers</p>
          <Link
            href="/campaigns/new"
            className={cn(buttonVariants({ size: 'sm' }), 'mt-5 bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white gap-1.5')}
          >
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              token={token}
              onDeleted={() => qc.invalidateQueries({ queryKey: ['campaigns'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
