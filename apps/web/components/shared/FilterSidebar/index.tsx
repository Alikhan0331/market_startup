'use client';

import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Slider } from '../../ui/slider';
import { Separator } from '../../ui/separator';

export interface Filters {
  country: string;
  city: string;
  category: string;
  platform: string;
  minFollowers: number;
  maxFollowers: number;
  minPrice: number;
  maxPrice: number;
  minER: number;
}

interface FilterSidebarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const CATEGORIES = [
  'All', 'Fashion', 'Beauty', 'Tech', 'Gaming', 'Fitness',
  'Food', 'Travel', 'Lifestyle', 'Finance', 'Education',
];

const PLATFORMS = [
  { value: '', label: 'All' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
];

const MAX_FOLLOWERS = 1_000_000;
const MAX_PRICE = 10_000;

function formatFollowers(n: number) {
  if (n >= 1_000_000) return '1M+';
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function formatPrice(n: number) {
  if (n === 0) return '$0';
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n}`;
}

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  function update(partial: Partial<Filters>) {
    onChange({ ...filters, ...partial });
  }

  // 0 means "no cap" — display as max on the slider
  const sliderMaxFollowers = filters.maxFollowers === 0 ? MAX_FOLLOWERS : filters.maxFollowers;
  const sliderMaxPrice = filters.maxPrice === 0 ? MAX_PRICE : filters.maxPrice;

  return (
    <aside className="w-56 shrink-0 space-y-5">

      {/* ── Нища ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Niche</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const val = cat === 'All' ? '' : cat;
            const active = filters.category === val;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => update({ category: val })}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  active
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── География ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Geography</Label>
        <Input
          placeholder="Country"
          value={filters.country}
          onChange={(e) => update({ country: e.target.value })}
          className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-sm"
        />
        <Input
          placeholder="City"
          value={filters.city}
          onChange={(e) => update({ city: e.target.value })}
          className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 text-sm"
        />
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Платформа ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Platform</Label>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map(({ value, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => update({ platform: value })}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                filters.platform === value
                  ? 'bg-[#4F6EF7] text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Аудитория (подписчики) ───────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Audience: {formatFollowers(filters.minFollowers)} – {filters.maxFollowers === 0 ? 'Any' : formatFollowers(filters.maxFollowers)}
        </Label>
        <Slider
          min={0}
          max={MAX_FOLLOWERS}
          step={10_000}
          value={[filters.minFollowers, sliderMaxFollowers]}
          onValueChange={(val) => {
            const arr = Array.isArray(val) ? val : [val];
            const min = arr[0] ?? 0;
            const max = arr[1] ?? MAX_FOLLOWERS;
            // treat full-max as "no cap" (0)
            update({ minFollowers: min, maxFollowers: max === MAX_FOLLOWERS ? 0 : max });
          }}
          className="[&>span]:bg-[#4F6EF7]"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>0</span>
          <span>1M+</span>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Бюджет ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Budget: {formatPrice(filters.minPrice)} – {filters.maxPrice === 0 ? 'Any' : formatPrice(filters.maxPrice)}
        </Label>
        <Slider
          min={0}
          max={MAX_PRICE}
          step={100}
          value={[filters.minPrice, sliderMaxPrice]}
          onValueChange={(val) => {
            const arr = Array.isArray(val) ? val : [val];
            const max = arr[1] ?? MAX_PRICE;
            update({ minPrice: arr[0] ?? 0, maxPrice: max === MAX_PRICE ? 0 : max });
          }}
          className="[&>span]:bg-emerald-500"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>$0</span>
          <span>$10K+</span>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {/* ── Минимальный ER ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Min ER: {filters.minER === 0 ? 'Any' : `${filters.minER}%`}
        </Label>
        <Slider
          min={0}
          max={20}
          step={0.5}
          value={[filters.minER]}
          onValueChange={(val) => {
            const arr = Array.isArray(val) ? val : [val];
            update({ minER: arr[0] ?? 0 });
          }}
          className="[&>span]:bg-violet-500"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>0%</span>
          <span>20%</span>
        </div>
      </div>

    </aside>
  );
}
