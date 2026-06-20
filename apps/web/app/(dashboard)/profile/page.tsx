'use client';

import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { influencersApi } from '../../../lib/api/influencers';
import { brandsApi } from '../../../lib/api/brands';
import { buttonVariants } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { InfluencerProfile, BrandProfile } from '../../../types/api';
import { YoutubeConnector } from '../../../components/shared/YoutubeConnector';

const influencerSchema = z.object({
  displayName: z.string().min(1, 'Required'),
  bio: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  categories: z.string().optional(), // comma-separated, converted to array before submit
  instagramHandle: z.string().optional(),
  instagramFollowers: z.number().min(0).optional(),
  instagramER: z.number().min(0).max(100).optional(),
  instagramAvgReach: z.number().min(0).optional(),
  tiktokHandle: z.string().optional(),
  tiktokFollowers: z.number().min(0).optional(),
  tiktokAvgViews: z.number().min(0).optional(),
  youtubeHandle: z.string().optional(),
  youtubeSubscribers: z.number().min(0).optional(),
  youtubeAvgViews: z.number().min(0).optional(),
  priceFrom: z.number().min(0).optional(),
  priceTo: z.number().min(0).optional(),
});

const brandSchema = z.object({
  companyName: z.string().min(1, 'Required'),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  industry: z.string().optional(),
  description: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

type InfluencerForm = z.infer<typeof influencerSchema>;
type BrandForm = z.infer<typeof brandSchema>;

function Field({ label, children, error, hint }: { label: string; children: React.ReactNode; error?: string; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300 text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass = 'border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500';

function InfluencerProfileForm({ profile, token, onSave }: { profile?: InfluencerProfile | null; token: string; onSave: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InfluencerForm>({
    resolver: zodResolver(influencerSchema),
    defaultValues: { displayName: '' },
  });

  useEffect(() => {
    if (profile) reset({
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
      categories: Array.isArray(profile.categories)
        ? profile.categories.filter(Boolean).join(', ')
        : '',
      instagramHandle: profile.instagramHandle ?? '',
      instagramFollowers: profile.instagramFollowers ?? undefined,
      instagramER: profile.instagramER ?? undefined,
      instagramAvgReach: profile.instagramAvgReach ?? undefined,
      tiktokHandle: profile.tiktokHandle ?? '',
      tiktokFollowers: profile.tiktokFollowers ?? undefined,
      tiktokAvgViews: profile.tiktokAvgViews ?? undefined,
      youtubeHandle: profile.youtubeHandle ?? '',
      youtubeSubscribers: profile.youtubeSubscribers ?? undefined,
      youtubeAvgViews: profile.youtubeAvgViews ?? undefined,
      priceFrom: profile.priceFrom ?? undefined,
      priceTo: profile.priceTo ?? undefined,
    });
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: InfluencerForm) => {
      // Convert comma-separated categories string to array
      const categories = data.categories
        ? data.categories.split(',').map((c) => c.trim()).filter(Boolean)
        : [];
      return influencersApi.updateMe({ ...data, categories } as any, token);
    },
    onSuccess: () => { toast.success('Profile saved'); onSave(); },
    onError: (err: any) => toast.error(err?.message ?? 'Save failed'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Display name *" error={errors.displayName?.message}>
          <Input className={inputClass} {...register('displayName')} />
        </Field>
        <Field label="Country">
          <Input className={inputClass} {...register('country')} />
        </Field>
        <Field label="City">
          <Input className={inputClass} {...register('city')} />
        </Field>
        <Field label="Price from (USD)" error={errors.priceFrom?.message}>
          <Input type="number" className={inputClass} {...register('priceFrom', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
        <Field label="Price to (USD)" error={errors.priceTo?.message}>
          <Input type="number" className={inputClass} {...register('priceTo', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
      </div>
      <Field
        label="Categories"
        hint="Comma-separated, e.g: Fashion, Lifestyle, Beauty — used for matching"
      >
        <Input
          className={inputClass}
          placeholder="Fashion, Lifestyle, Beauty"
          {...register('categories')}
        />
      </Field>
      <Field label="Bio">
        <textarea rows={3} className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${inputClass} focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]`} {...register('bio')} />
      </Field>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider pt-2">Instagram</p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Handle"><Input className={inputClass} placeholder="@handle" {...register('instagramHandle')} /></Field>
        <Field label="Followers" error={errors.instagramFollowers?.message}>
          <Input type="number" className={inputClass} {...register('instagramFollowers', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
        <Field label="ER (0–100%)" error={errors.instagramER?.message}>
          <Input type="number" step="0.01" className={inputClass} {...register('instagramER', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
      </div>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider pt-2">TikTok</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Handle"><Input className={inputClass} placeholder="@handle" {...register('tiktokHandle')} /></Field>
        <Field label="Followers" error={errors.tiktokFollowers?.message}>
          <Input type="number" className={inputClass} {...register('tiktokFollowers', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
      </div>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider pt-2">YouTube</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Handle"><Input className={inputClass} placeholder="@handle" {...register('youtubeHandle')} /></Field>
        <Field label="Subscribers" error={errors.youtubeSubscribers?.message}>
          <Input type="number" className={inputClass} {...register('youtubeSubscribers', { setValueAs: (v) => (v === '' || v == null ? undefined : Number(v)) })} />
        </Field>
      </div>
      <button type="submit" className={buttonVariants() + ' bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white'} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}

function BrandProfileForm({ profile, token, onSave }: { profile?: BrandProfile | null; token: string; onSave: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
    defaultValues: { companyName: '' },
  });

  useEffect(() => {
    if (profile) reset({
      companyName: profile.companyName ?? '',
      website: profile.website ?? '',
      industry: profile.industry ?? '',
      description: profile.description ?? '',
      country: profile.country ?? '',
      city: profile.city ?? '',
    });
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: BrandForm) => brandsApi.updateMe(data as any, token),
    onSuccess: () => { toast.success('Profile saved'); onSave(); },
    onError: (err: any) => toast.error(err?.message ?? 'Save failed'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company name *" error={errors.companyName?.message}>
          <Input className={inputClass} {...register('companyName')} />
        </Field>
        <Field label="Industry" hint="e.g. Fashion, Technology, Food — used for matching">
          <Input className={inputClass} placeholder="Fashion" {...register('industry')} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <Input className={inputClass} placeholder="https://" {...register('website')} />
        </Field>
        <Field label="Country">
          <Input className={inputClass} {...register('country')} />
        </Field>
        <Field label="City">
          <Input className={inputClass} {...register('city')} />
        </Field>
      </div>
      <Field label="Description">
        <textarea rows={3} className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${inputClass} focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]`} {...register('description')} />
      </Field>
      <button type="submit" className={buttonVariants() + ' bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white'} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const token = (session?.user as any)?.accessToken as string;
  const role = (session?.user as any)?.role as string;
  const isInfluencer = role === 'INFLUENCER';

  const { data: influencerProfile } = useQuery({
    queryKey: ['profile', 'influencer'],
    queryFn: async () => {
      try { return await influencersApi.getMe(token); }
      catch (e: any) { if (e?.statusCode === 404) return null; throw e; }
    },
    enabled: !!token && isInfluencer,
  });

  const { data: brandProfile } = useQuery({
    queryKey: ['profile', 'brand'],
    queryFn: async () => {
      try { return await brandsApi.getMe(token); }
      catch (e: any) { if (e?.statusCode === 404) return null; throw e; }
    },
    enabled: !!token && !isInfluencer,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['profile'] });
  const hasProfile = isInfluencer ? !!influencerProfile : !!brandProfile;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">
        {isInfluencer ? 'Influencer Profile' : 'Brand Profile'}
      </h1>
      {!hasProfile && (
        <p className="text-sm text-zinc-500">
          Fill in your details below and click <strong className="text-zinc-300">Save profile</strong> to create your profile.
        </p>
      )}
      {isInfluencer ? (
        <>
          <InfluencerProfileForm profile={influencerProfile} token={token} onSave={invalidate} />
          <YoutubeConnector
            token={token}
            currentHandle={influencerProfile?.youtubeHandle}
            lastSyncAt={influencerProfile?.youtubeLastSyncAt as any}
            onSaved={invalidate}
          />
        </>
      ) : (
        <BrandProfileForm profile={brandProfile} token={token} onSave={invalidate} />
      )}
    </div>
  );
}
