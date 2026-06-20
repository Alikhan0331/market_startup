'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { youtubeApi, YoutubeChannelResult } from '../../../lib/api/youtube';
import { buttonVariants } from '../../ui/button';
import { Input } from '../../ui/input';
import { cn } from '../../../lib/utils';

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface Props {
  token: string;
  currentHandle?: string;
  lastSyncAt?: string;
  onSaved: () => void;
}

export function YoutubeConnector({ token, currentHandle, lastSyncAt, onSaved }: Props) {
  const [handle, setHandle] = useState(currentHandle ?? '');
  const [result, setResult] = useState<YoutubeChannelResult | null>(null);
  const qc = useQueryClient();

  const analyzeMutation = useMutation({
    mutationFn: () => youtubeApi.analyze(handle.trim()),
    onSuccess: (data) => setResult(data),
    onError: (err: any) => toast.error(err?.message ?? 'Channel not found'),
  });

  const saveMutation = useMutation({
    mutationFn: () => youtubeApi.saveToProfile(result!, token),
    onSuccess: () => {
      toast.success('YouTube stats saved');
      qc.invalidateQueries({ queryKey: ['profile'] });
      onSaved();
    },
    onError: (err: any) => toast.error(err?.message ?? 'Failed to save'),
  });

  return (
    <div className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">YouTube</p>
        {lastSyncAt && (
          <p className="text-xs text-zinc-600">
            Last sync: {new Date(lastSyncAt).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
          placeholder="@channel or channel ID"
          value={handle}
          onChange={(e) => { setHandle(e.target.value); setResult(null); }}
        />
        <button
          type="button"
          onClick={() => analyzeMutation.mutate()}
          disabled={!handle.trim() || analyzeMutation.isPending}
          className={cn(buttonVariants({ variant: 'outline' }), 'border-zinc-700 text-zinc-300 shrink-0')}
        >
          {analyzeMutation.isPending ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-zinc-100">{result.title}</p>
            <span className="text-xs text-zinc-500">{result.handle}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Subscribers" value={fmt(result.subscribers)} />
            <Stat label="Avg views" value={fmt(result.avgViews)} />
            <Stat label="Median views" value={fmt(result.medianViews)} />
            <Stat label="Engagement rate" value={result.engagementRate.toFixed(2) + '%'} />
            <Stat label="Reach rate" value={result.reachRate.toFixed(2) + '%'} />
            <Stat label="Stability score" value={result.stabilityScore.toFixed(1) + ' / 10'} />
          </div>

          <p className="text-xs text-zinc-600">
            Based on {result.analyzedVideosCount} recent videos
          </p>

          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn(buttonVariants(), 'bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white w-full')}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save to profile'}
          </button>
        </div>
      )}
    </div>
  );
}
