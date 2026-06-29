'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { youtubeApi, YoutubeChannelResult } from '../../../lib/api/youtube';
import { apiClient } from '../../../lib/api/client';
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

interface YoutubeOAuthData {
  connected: boolean;
  channelId?: string;
  handle?: string;
  subscribers?: number;
  avgViews?: number;
  er?: number;
  lastSyncAt?: string;
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
  const searchParams = useSearchParams();
  const qc = useQueryClient();

  const connectUrl = `${process.env.NEXT_PUBLIC_API_URL}/youtube/connect?state=${encodeURIComponent(token)}`;

  useEffect(() => {
    const status = searchParams.get('youtube');
    if (status === 'connected') {
      toast.success('YouTube channel verified and connected!');
      qc.invalidateQueries({ queryKey: ['youtube-me'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      onSaved();
    } else if (status === 'error') {
      toast.error(searchParams.get('msg') ?? 'YouTube connection failed');
    }
  }, []);

  const { data: oauthData } = useQuery({
    queryKey: ['youtube-me'],
    queryFn: () => apiClient.get<YoutubeOAuthData>('/youtube/me', token),
    enabled: !!token,
  });

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
        {(oauthData?.lastSyncAt ?? lastSyncAt) && (
          <p className="text-xs text-zinc-600">
            Last sync: {new Date((oauthData?.lastSyncAt ?? lastSyncAt)!).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* OAuth connected state */}
      {oauthData?.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center shrink-0">
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.54 3.5 12 3.5 12 3.5s-7.54 0-9.38.55A3.02 3.02 0 0 0 .5 6.19C0 8.04 0 12 0 12s0 3.96.5 5.81a3.02 3.02 0 0 0 2.12 2.14C4.46 20.5 12 20.5 12 20.5s7.54 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14C24 15.96 24 12 24 12s0-3.96-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">{oauthData.handle ?? 'Channel connected'}</p>
              <p className="text-xs text-emerald-400">✓ Verified via Google OAuth</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Subscribers" value={fmt(oauthData.subscribers ?? 0)} />
            <Stat label="Avg views" value={fmt(oauthData.avgViews ?? 0)} />
            <Stat label="ER" value={Number(oauthData.er ?? 0).toFixed(1) + '%'} />
          </div>
          <a
            href={connectUrl}
            className={cn(buttonVariants({ variant: 'outline' }), 'border-zinc-700 text-zinc-300 w-full text-center')}
          >
            Reconnect YouTube
          </a>
        </div>
      ) : (
        /* Not connected via OAuth */
        <div className="space-y-4">
          <div className="space-y-2">
            <a
              href={connectUrl}
              className={cn(buttonVariants(), 'bg-red-600 hover:bg-red-700 text-white w-full text-center block')}
            >
              Connect YouTube via Google
            </a>
            <p className="text-xs text-zinc-500 text-center">
              Verifies you own the channel — only your channels will be available
            </p>
          </div>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="mx-3 text-xs text-zinc-600">or enter manually</span>
            <div className="flex-grow border-t border-zinc-800" />
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
              <p className="text-xs text-zinc-600">Based on {result.analyzedVideosCount} recent videos</p>
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
      )}
    </div>
  );
}
