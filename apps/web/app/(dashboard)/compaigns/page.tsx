'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Megaphone, Calendar, DollarSign, Tag, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatPrice, formatDate } from '../../../lib/utils/formatters';

// ── Mock data (заменить на реальный API позже) ──────────────────────────────
const MOCK_CAMPAIGNS = [
    {
        id: '1',
        title: 'Summer Collection Launch',
        brand: 'Nike Kazakhstan',
        topic: 'Fashion & Lifestyle',
        direction: 'Instagram Reels + Stories',
        deadline: '2025-08-01',
        budget: 250000,
        description: 'Looking for lifestyle influencers to promote summer collection naturally in everyday settings.',
        takenBy: null,
    },
    {
        id: '2',
        title: 'Tech Review Campaign',
        brand: 'Samsung KZ',
        topic: 'Technology',
        direction: 'YouTube Review (10+ min)',
        deadline: '2025-07-15',
        budget: 500000,
        description: 'Detailed honest review of our latest Galaxy phone. Device provided, paid upon posting.',
        takenBy: null,
    },
    {
        id: '3',
        title: 'Healthy Food Promo',
        brand: 'GreenMeal',
        topic: 'Food & Health',
        direction: 'TikTok / Reels',
        deadline: '2025-07-25',
        budget: 120000,
        description: 'Show our meal-prep boxes in your daily routine. Minimum 50k followers required.',
        takenBy: 'influencer_001',
    },
];

type Campaign = typeof MOCK_CAMPAIGNS[number];

// ── Campaign Card ───────────────────────────────────────────────────────────
function CampaignCard({ campaign, role, onTake, taking }: {
    campaign: Campaign;
    role: string;
    onTake: (id: string) => void;
    taking: string | null;
}) {
    const isTaken = !!campaign.takenBy;

    return (
        <div className={cn(
            'rounded-lg border bg-zinc-900 p-5 space-y-3 transition-colors',
            isTaken ? 'border-zinc-700 opacity-70' : 'border-zinc-800 hover:border-zinc-600',
        )}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-zinc-100">{campaign.title}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{campaign.brand}</p>
                </div>
                {isTaken ? (
                    <span className="flex items-center gap-1 rounded-full bg-green-900/30 px-2.5 py-1 text-xs font-medium text-green-400">
            <CheckCircle2 className="h-3 w-3" /> Taken
          </span>
                ) : (
                    <span className="rounded-full bg-[#4F6EF7]/10 px-2.5 py-1 text-xs font-medium text-[#4F6EF7]">Open</span>
                )}
            </div>

            {/* Тема, направление, дедлайн, оплата */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <Tag className="h-3.5 w-3.5" />
                    <span className="truncate">{campaign.topic}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <Megaphone className="h-3.5 w-3.5" />
                    <span className="truncate">{campaign.direction}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Deadline: {formatDate(campaign.deadline)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-100 font-medium">
                    <DollarSign className="h-3.5 w-3.5 text-green-400" />
                    <span>{formatPrice(campaign.budget)}</span>
                </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">{campaign.description}</p>

            {role === 'INFLUENCER' && !isTaken && (
                <button
                    onClick={() => onTake(campaign.id)}
                    disabled={taking === campaign.id}
                    className="flex items-center gap-1.5 rounded-md bg-[#4F6EF7] hover:bg-[#3D5CE5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 transition-colors"
                >
                    {taking === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Take this project
                </button>
            )}
        </div>
    );
}

// ── New Campaign Form (только для BRAND) ────────────────────────────────────
function NewCampaignForm({ onClose }: { onClose: () => void }) {
    const [form, setForm] = useState({ title: '', topic: '', direction: '', deadline: '', budget: '', description: '' });
    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="rounded-lg border border-[#4F6EF7]/30 bg-zinc-900 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">New Campaign</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="col-span-full space-y-1">
                    <label className="text-xs text-zinc-400">Campaign Title</label>
                    <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Summer Launch"
                           className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Topic / Niche</label>
                    <input value={form.topic} onChange={e => set('topic', e.target.value)} placeholder="Fashion, Tech, Food..."
                           className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Direction / Format</label>
                    <input value={form.direction} onChange={e => set('direction', e.target.value)} placeholder="Instagram Reels, YouTube..."
                           className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Deadline</label>
                    <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)}
                           className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400">Payment (KZT)</label>
                    <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="150000"
                           className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
                <div className="col-span-full space-y-1">
                    <label className="text-xs text-zinc-400">Description for influencer</label>
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                              placeholder="Requirements, content style, deliverables..."
                              className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none focus:ring-1 focus:ring-[#4F6EF7]" />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={onClose} className="rounded-md bg-[#4F6EF7] hover:bg-[#3D5CE5] px-4 py-2 text-sm font-medium text-white">Post Campaign</button>
                <button onClick={onClose} className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-100">Cancel</button>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function CampaignsPage() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role as string;

    const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS);
    const [taking, setTaking] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const handleTake = (id: string) => {
        setTaking(id);
        setTimeout(() => {
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, takenBy: 'me' } : c));
            setTaking(null);
        }, 900);
    };

    const open = campaigns.filter(c => !c.takenBy);
    const taken = campaigns.filter(c => c.takenBy);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-zinc-100">Campaigns</h1>
                    <p className="text-sm text-zinc-500 mt-0.5">
                        {role === 'BRAND'
                            ? 'Post campaign orders for influencers to pick up'
                            : 'Browse open campaigns and take on projects'}
                    </p>
                </div>
                {role === 'BRAND' && (
                    <button onClick={() => setShowForm(v => !v)}
                            className="flex items-center gap-1.5 rounded-md bg-[#4F6EF7] hover:bg-[#3D5CE5] px-3 py-2 text-sm font-medium text-white">
                        <Plus className="h-4 w-4" /> New campaign
                    </button>
                )}
            </div>

            {showForm && <NewCampaignForm onClose={() => setShowForm(false)} />}

            <section className="space-y-3">
                <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Open · {open.length}</h2>
                {open.length === 0
                    ? <p className="text-sm text-zinc-500 py-8 text-center">No open campaigns</p>
                    : open.map(c => <CampaignCard key={c.id} campaign={c} role={role} onTake={handleTake} taking={taking} />)
                }
            </section>

            {taken.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">Taken · {taken.length}</h2>
                    {taken.map(c => <CampaignCard key={c.id} campaign={c} role={role} onTake={handleTake} taking={taking} />)}
                </section>
            )}
        </div>
    );
}