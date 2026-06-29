'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { dealsApi } from '../../../../lib/api/deals';
import { reliabilityApi, ReliabilityEvent } from '../../../../lib/api/reliability';
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
  const [disputeReason, setDisputeReason] = useState('');
  const [disputingEventId, setDisputingEventId] = useState<string | null>(null);
  const [brandRating, setBrandRating] = useState<number | null>(null);
  const [revisionCount, setRevisionCount] = useState('');
  const [agreedToAccept, setAgreedToAccept] = useState(false);

  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.getById(id, token),
    enabled: !!token,
  });

  const { data: reliabilityEvents } = useQuery({
    queryKey: ['reliability-events-deal', id],
    queryFn: async () => {
      if (!deal?.influencer?.id) return [];
      const events = await reliabilityApi.getEvents(deal.influencer.id, token);
      return events.filter((e) => e.dealId === id);
    },
    enabled: !!token && !!deal && role === 'INFLUENCER',
  });

  const reportNoResponse = useMutation({
    mutationFn: () => reliabilityApi.reportNoResponse(id, token),
    onSuccess: (data: any) => {
      if (data?.warned) {
        toast.success('Warning sent. If the influencer does not respond within 24 hours, click again to record no response.');
        invalidate();
      } else {
        toast.success('No response recorded');
        invalidate();
      }
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to report'),
  });

  const openDispute = useMutation({
    mutationFn: () =>
      reliabilityApi.openDispute(disputingEventId!, disputeReason, token),
    onSuccess: () => {
      toast.success('Dispute submitted');
      setDisputingEventId(null);
      setDisputeReason('');
    },
    onError: () => toast.error('Failed to submit dispute'),
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
    mutationFn: () => dealsApi.complete(id, token, {
      brandRating: brandRating ?? undefined,
      revisionCount: revisionCount ? Number(revisionCount) : undefined,
    }),
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

  const dealAgeInDays = deal
    ? (Date.now() - new Date(deal.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const canReportNoResponse =
    role === 'BRAND' && deal?.status === 'PENDING' && dealAgeInDays >= 3;

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

      {canAcceptReject && role === 'INFLUENCER' && (
        <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-xs font-medium text-zinc-300 uppercase tracking-wider">Electronic Agreement</p>
          <p className="text-xs text-zinc-400 leading-relaxed">
            By accepting this offer I commit to delivering the content described above by{' '}
            <span className="text-zinc-200 font-medium">{formatDate(deal.deadline)}</span> for{' '}
            <span className="text-zinc-200 font-medium">{formatPrice(deal.counterBudget ?? deal.budget)}</span>.
            This constitutes a simple electronic agreement between me and the brand.
          </p>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreedToAccept}
              onChange={(e) => setAgreedToAccept(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-zinc-600 accent-[#4F6EF7]"
            />
            <span className="text-sm text-zinc-300">
              I agree to the terms and commit to fulfilling this deal
            </span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canAcceptReject && (
          <>
            <Button
              className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
              size="sm"
              disabled={accept.isPending || (role === 'INFLUENCER' && !agreedToAccept)}
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
        {canReportNoResponse && (
          <Button
            variant="outline"
            size="sm"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            disabled={reportNoResponse.isPending}
            onClick={() => reportNoResponse.mutate()}
          >
            Report no response
          </Button>
        )}
      </div>

      {canComplete && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Before marking complete (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Quality rating (1–5)</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setBrandRating(brandRating === star ? null : star)}
                    className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                      brandRating === star
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {star}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Revisions requested</Label>
              <Input
                type="number"
                min="0"
                value={revisionCount}
                onChange={(e) => setRevisionCount(e.target.value)}
                placeholder="0"
                className="border-zinc-700 bg-zinc-800 text-zinc-100 w-24"
              />
            </div>
          </div>
        </div>
      )}

      {deal.noResponseWarnedAt && deal.status === 'PENDING' && role === 'INFLUENCER' && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <p className="text-sm text-amber-400 font-medium">Action required</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            The brand reported no response. Please accept, reject, or counter this offer to avoid a reliability penalty.
          </p>
        </div>
      )}

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

      {(deal.brandAgreedAt || deal.influencerAgreedAt) && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Electronic Agreement Record</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Brand</span>
              {deal.brandAgreedAt ? (
                <span className="text-xs text-emerald-400">
                  ✓ Agreed · {new Date(deal.brandAgreedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-xs text-zinc-600">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Influencer</span>
              {deal.influencerAgreedAt ? (
                <span className="text-xs text-emerald-400">
                  ✓ Agreed · {new Date(deal.influencerAgreedAt).toLocaleString()}
                </span>
              ) : (
                <span className="text-xs text-zinc-600">Pending</span>
              )}
            </div>
          </div>
          {deal.brandAgreedAt && deal.influencerAgreedAt && (
            <p className="text-xs text-zinc-500 border-t border-zinc-800 pt-2">
              Both parties electronically agreed to the deal terms. Deal ID: {deal.id}
            </p>
          )}
        </div>
      )}

      {role === 'INFLUENCER' && reliabilityEvents && reliabilityEvents.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Reliability events</p>
          {reliabilityEvents.map((event: ReliabilityEvent) => (
            <div key={event.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${
                  ['COMPLETED_ON_TIME', 'COMPLETED_EARLY'].includes(event.eventType)
                    ? 'text-emerald-400'
                    : event.eventType === 'CANCELLED_BY_BRAND'
                    ? 'text-zinc-400'
                    : 'text-red-400'
                }`}>
                  {event.eventType.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs rounded-full px-2 py-0.5 ${
                  event.status === 'ACTIVE' ? 'bg-zinc-800 text-zinc-400'
                  : event.status === 'DISPUTED' ? 'bg-amber-500/15 text-amber-400'
                  : event.status === 'DISMISSED' ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400'
                }`}>
                  {event.status}
                </span>
              </div>
              {event.status === 'ACTIVE' && (
                <>
                  {disputingEventId === event.id ? (
                    <div className="space-y-2">
                      <Input
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Explain why this event is wrong..."
                        className="border-zinc-700 bg-zinc-800 text-zinc-100 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white"
                          disabled={!disputeReason || openDispute.isPending}
                          onClick={() => openDispute.mutate()}
                        >
                          Submit dispute
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-zinc-500"
                          onClick={() => { setDisputingEventId(null); setDisputeReason(''); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 text-xs"
                      onClick={() => setDisputingEventId(event.id)}
                    >
                      Dispute this event
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
