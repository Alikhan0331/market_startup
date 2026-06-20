import { InfluencerProfile } from '../../../types/api';

function Bar({ value, max = 10, color }: { value?: number | null; max?: number; color: string }) {
  const pct = value != null ? Math.min((Number(value) / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-zinc-800">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function ScoreRow({
  label, score, weight, description, color,
}: { label: string; score?: number | null; weight: string; description: string; color: string }) {
  const val = score != null ? Number(score).toFixed(1) : '—';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-200">{label}</span>
          <span className="text-xs text-zinc-600">×{weight}</span>
        </div>
        <span className="text-sm font-semibold text-zinc-100">{val}<span className="text-zinc-600 text-xs"> /10</span></span>
      </div>
      <Bar value={score} color={color} />
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

interface Props {
  profile: InfluencerProfile;
}

export function ScoreBreakdown({ profile }: Props) {
  const overall = profile.overallScore != null ? Number(profile.overallScore).toFixed(1) : null;

  const statusColors: Record<string, string> = {
    VERIFIED: 'text-emerald-400',
    UNVERIFIED: 'text-zinc-400',
    WARNING: 'text-amber-400',
    SUSPICIOUS: 'text-red-400',
  };

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Score breakdown</p>
        {overall ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-zinc-100">{overall}</span>
            <span className="text-xs text-zinc-500">/10</span>
          </div>
        ) : (
          <span className="text-xs text-zinc-600">Not calculated yet</span>
        )}
      </div>

      {overall ? (
        <>
          <div className="space-y-4">
            <ScoreRow
              label="Reach"
              score={profile.reachScore}
              weight="0.4"
              description="Followers relative to platform benchmark (Instagram 1M · TikTok 2M · YouTube 1.5M)"
              color="bg-[#4F6EF7]"
            />
            <ScoreRow
              label="Engagement"
              score={profile.engagementScore}
              weight="0.4"
              description="ER relative to platform average (Instagram 3% · TikTok 6% · YouTube 4%)"
              color="bg-violet-500"
            />
            <ScoreRow
              label="Audience"
              score={profile.audienceScore}
              weight="0.2"
              description="Number of active platforms (1 platform = 3.3 · 2 = 6.7 · 3 = 10)"
              color="bg-sky-500"
            />
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-600 font-mono">
              Overall = Reach×0.4 + Engagement×0.4 + Audience×0.2
            </p>
          </div>

          {profile.verificationStatus && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Fraud check:</span>
              <span className={`text-xs font-medium ${statusColors[profile.verificationStatus] ?? 'text-zinc-400'}`}>
                {profile.verificationStatus}
              </span>
              {profile.verificationStatus === 'SUSPICIOUS' && (
                <span className="text-xs text-zinc-600">— ER &gt; 20%</span>
              )}
              {profile.verificationStatus === 'WARNING' && (
                <span className="text-xs text-zinc-600">— followers &gt;100k but reach &lt;1%</span>
              )}
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-zinc-500">
          Fill in your social stats and save — the score will be calculated automatically.
        </p>
      )}
    </div>
  );
}
