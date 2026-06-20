'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { influencersApi, SearchParams } from '../../../lib/api/influencers';
import { matchingApi } from '../../../lib/api/matching';
import { FilterSidebar, Filters } from '../../../components/shared/FilterSidebar';
import { InfluencerCard } from '../../../components/shared/InfluencerCard';
import { MatchCard } from '../../../components/shared/MatchCard';
import { Button } from '../../../components/ui/button';
import { ChevronLeft, ChevronRight, SlidersHorizontal, Sparkles, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { cn } from '../../../lib/utils';

const DEFAULT_FILTERS: Filters = {
  country: '',
  city: '',
  category: '',
  platform: '',
  minFollowers: 0,
  maxFollowers: 1_000_000,
  minPrice: 0,
  maxPrice: 0,
  minER: 0,
};

type Tab = 'all' | 'foryou';

export default function SearchPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken as string | undefined;
  const role = (session?.user as any)?.role as string | undefined;

  const [tab, setTab] = useState<Tab>('all');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('score');
  const [showFilters, setShowFilters] = useState(true);

  const handleFiltersChange = useCallback((f: Filters) => {
    setFilters(f);
    setPage(1);
  }, []);

  const params: SearchParams = {
    ...(filters.country && { country: filters.country }),
    ...(filters.city && { city: filters.city }),
    ...(filters.category && { category: filters.category }),
    ...(filters.platform && { platform: filters.platform as any }),
    ...(filters.minFollowers > 0 && { minFollowers: filters.minFollowers }),
    ...(filters.maxFollowers < 1_000_000 && { maxFollowers: filters.maxFollowers }),
    ...(filters.minPrice > 0 && { minPrice: filters.minPrice }),
    ...(filters.maxPrice > 0 && { maxPrice: filters.maxPrice }),
    ...(filters.minER > 0 && { minER: filters.minER }),
    sortBy: sortBy as any,
    sortOrder: 'desc',
    page,
    limit: 20,
  };

  const { data: searchData, isLoading: searchLoading, isFetching: searchFetching } = useQuery({
    queryKey: ['influencers', params],
    queryFn: () => influencersApi.search(params, token),
    enabled: role === 'BRAND' && tab === 'all',
  });

  const { data: recommended, isLoading: recLoading } = useQuery({
    queryKey: ['matching', 'recommended'],
    queryFn: () => matchingApi.getRecommended(40, token),
    enabled: role === 'BRAND' && tab === 'foryou',
  });

  if (role && role !== 'BRAND') {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-lg font-medium text-zinc-300">Access restricted</p>
        <p className="text-sm text-zinc-500 mt-1">Only brands can discover influencers</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-100">Discover</h1>

        {tab === 'all' && (
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(v) => { if (v) { setSortBy(v); setPage(1); } }}>
              <SelectTrigger className="w-36 border-zinc-700 bg-zinc-800 text-zinc-300 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-100">
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="followers">Followers</SelectItem>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="er">Engagement</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Табы ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-zinc-800 -mt-2">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'all'
              ? 'border-[#4F6EF7] text-[#4F6EF7]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Search className="h-3.5 w-3.5" />
          All
          {searchData && tab === 'all' && (
            <span className="ml-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {searchData.meta.total.toLocaleString()}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('foryou')}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            tab === 'foryou'
              ? 'border-[#4F6EF7] text-[#4F6EF7]'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          For You
          {recommended && tab === 'foryou' && (
            <span className="ml-1 rounded-full bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {recommended.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Контент ────────────────────────────────────────────────── */}
      <div className="flex gap-6">
        {tab === 'all' && showFilters && (
          <FilterSidebar filters={filters} onChange={handleFiltersChange} />
        )}

        <div className="flex-1 min-w-0">

          {/* ALL tab */}
          {tab === 'all' && (
            <>
              {searchLoading || searchFetching ? (
                <SkeletonGrid />
              ) : searchData?.data.length === 0 ? (
                <EmptyState onReset={() => setFilters(DEFAULT_FILTERS)} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {searchData?.data.map((inf) => (
                    <InfluencerCard key={inf.id} influencer={inf} />
                  ))}
                </div>
              )}

              {searchData && searchData.meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline" size="sm"
                    className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-zinc-400">{page} / {searchData.meta.totalPages}</span>
                  <Button
                    variant="outline" size="sm"
                    className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    disabled={page === searchData.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {/* FOR YOU tab */}
          {tab === 'foryou' && (
            <>
              {recLoading ? (
                <SkeletonGrid />
              ) : !recommended || recommended.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Sparkles className="h-8 w-8 text-zinc-700 mb-3" />
                  <p className="text-base font-medium text-zinc-300">No matches yet</p>
                  <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                    Fill in your brand profile (industry, country, budget) — we&apos;ll find the best influencers for you.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-4">
                    Ranked by match score — based on your industry, geography and budget.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {recommended.map((r) => (
                      <MatchCard key={r.influencer.id} result={r} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-72 rounded-lg border border-zinc-800 bg-zinc-900 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-lg font-medium text-zinc-300">No influencers found</p>
      <p className="text-sm text-zinc-500 mt-1">Try adjusting your filters</p>
      <Button
        variant="outline" size="sm"
        className="mt-4 border-zinc-700 text-zinc-400"
        onClick={onReset}
      >
        Clear filters
      </Button>
    </div>
  );
}
