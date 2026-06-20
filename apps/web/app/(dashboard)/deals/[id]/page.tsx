'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { dealsApi } from '../../../../lib/api/deals';
import { DealStatusBadge } from '../../../../components/shared/DealStatusBadge';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { formatPrice, formatDate } from '../../../../lib/utils/formatters';

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const [counterBudget, setCounterBudget] = useState('');
  const [counterNote, setCounterNote] = useState('');

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.getById(id, token),
    enabled: !!token,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['deal', id] });
    queryClient.invalidateQueries({ queryKey: ['deals'] });
  };

  const accept = useMutation({
    mutationFn: () => dealsApi.accept(id, token),
    onSuccess: () => { toast.success('Deal accepted'); invalidate(); },
    onError: () => toast.error('Failed to accept'),
  });

  const reject = useMutation({
    mutationFn: () => dealsApi.reject(id, token),
    onSuccess: () => { toast.success('Deal rejected'); invalidate(); },
    onError: () => toast.error('Failed to reject'),
  });

  const counter = useMutation({
    mutationFn: () =>
      dealsApi.counter(id, { counterBudget: Number(counterBudget) * 100, counterNote }, token),
    onSuccess: () => { toast.success('Counter offer sent'); invalidate(); },
    onError: () => toast.error('Failed to send counter'),
  });

  const complete = useMutation({
    mutationFn: () => dealsApi.complete(id, token),
    onSuccess: () => { toast.success('Deal marked as completed'); invalidate(); },
    onError: () => toast.error('Failed to complete'),
  });

  const cancel = useMutation({
    mutationFn: () => dealsApi.cancel(id, token),
    onSuccess: () => { toast.success('Deal cancelled'); invalidate(); },
    onError: () => toast.error('Failed to cancel'),
  });

  if (isLoading) return <div className="h-40 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse" />;
  if (!deal) return <p className="text-zinc-400">Deal not found</p>;

  const canAcceptReject =
    (role === 'INFLUENCER' && (deal.status === 'PENDING' || deal.status === 'COUNTERED')) ||
    (role === 'BRAND' && deal.status === 'COUNTERED');
  const canCounter =
    (role === 'INFLUENCER' && deal.status === 'PENDING') ||
    (role === 'BRAND' && deal.status === 'COUNTERED');
  const canComplete = role === 'BRAND' && (deal.status === 'ACCEPTED' || deal.status === 'ACTIVE');
  const canCancel =
    deal.status === 'PENDING' ||
    deal.status === 'COUNTERED' ||
    deal.status === 'ACTIVE' ||
    deal.status === 'ACCEPTED';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Deal Detail</h1>
          <p className="text-sm text-zinc-500 mt-0.5 font-mono">{deal.id.slice(0, 8)}…</p>
        </div>
        <DealStatusBadge status={deal.status} />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {[
          ['Format', deal.format],
          ['Budget', formatPrice(deal.budget)],
          ['Deadline', formatDate(deal.deadline)],
          ['Brand', deal.brand?.companyName ?? '—'],
          ['Influencer', deal.influencer?.displayName ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between px-4 py-3">
            <span className="text-sm text-zinc-500">{label}</span>
            <span className="text-sm font-medium text-zinc-100">{value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Description</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{deal.description}</p>
      </div>

      {deal.counterBudget && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-1">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Counter offer</p>
          <p className="text-sm font-semibold text-zinc-100">{formatPrice(deal.counterBudget)}</p>
          {deal.counterNote && <p className="text-sm text-zinc-400">{deal.counterNote}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAcceptReject && (
          <>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
              size="sm"
              disabled={accept.isPending}
              onClick={() => accept.mutate()}
            >
              Accept
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              disabled={reject.isPending}
              onClick={() => reject.mutate()}
            >
              Reject
            </Button>
          </>
        )}
        {canComplete && (
          <Button
            className="bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white"
            size="sm"
            disabled={complete.isPending}
            onClick={() => complete.mutate()}
          >
            Mark complete
          </Button>
        )}
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            className="text-zinc-500 hover:text-zinc-300"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
          >
            Cancel
          </Button>
        )}
      </div>

      {canCounter && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-300">
            {role === 'BRAND' ? 'Respond with counter offer' : 'Send counter offer'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Budget (USD)</Label>
              <Input
                type="number"
                value={counterBudget}
                onChange={(e) => setCounterBudget(e.target.value)}
                placeholder="500"
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Note (optional)</Label>
              <Input
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Reason for counter..."
                className="border-zinc-700 bg-zinc-800 text-zinc-100"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white"
            disabled={!counterBudget || counter.isPending}
            onClick={() => counter.mutate()}
          >
            Send counter
          </Button>
        </div>
      )}
    </div>
  );
}
