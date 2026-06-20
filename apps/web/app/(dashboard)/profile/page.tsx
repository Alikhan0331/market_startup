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
  displayName: z.string().min(1),
  bio: z.string().optional(),
  country: z.string().min(1),
  city: z.string().optional(),
  instagramHandle: z.string().optional(),
  instagramFollowers: z.number().min(0).optional(),
  instagramER: z.number().min(0).max(1).optional(),
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
  companyName: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  industry: z.string().min(1),
  description: z.string().optional(),
  country: z.string().min(1),
  city: z.string().optional(),
});

type InfluencerForm = z.infer<typeof influencerSchema>;
type BrandForm = z.infer<typeof brandSchema>;

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-zinc-300 text-sm">{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const inputClass = 'border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500';

function InfluencerProfileForm({ profile, token, onSave }: { profile?: InfluencerProfile; token: string; onSave: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<InfluencerForm>({
    resolver: zodResolver(influencerSchema),
  });

  useEffect(() => {
    if (profile) reset(profile as any);
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: InfluencerForm) => influencersApi.updateMe(data as any, token),
    onSuccess: () => { toast.success('Profile updated'); onSave(); },
    onError: (err: any) => toast.error(err?.message ?? 'Update failed'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Display name" error={errors.displayName?.message}>
          <Input className={inputClass} {...register('displayName')} />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <Input className={inputClass} {...register('country')} />
        </Field>
        <Field label="City">
          <Input className={inputClass} {...register('city')} />
        </Field>
        <Field label="Price from (USD cents)" error={errors.priceFrom?.message}>
          <Input
            type="number"
            className={inputClass}
            {...register('priceFrom', {
              setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
            })}
          />
        </Field>
      </div>
      <Field label="Bio">
        <textarea rows={3} className={`w-full rounded-md border px-3 py-2 text-sm resize-none ${inputClass} focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]`} {...register('bio')} />
      </Field>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider pt-2">Instagram</p>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Handle">
          <Input className={inputClass} placeholder="@handle" {...register('instagramHandle')} />
        </Field>
        <Field label="Followers" error={errors.instagramFollowers?.message}>
          <Input
            type="number"
            className={inputClass}
            {...register('instagramFollowers', {
              setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
            })}
          />
        </Field>
        <Field label="ER (0–1)" error={errors.instagramER?.message}>
          <Input
            type="number"
            step="0.001"
            className={inputClass}
            {...register('instagramER', {
              setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
            })}
          />
        </Field>
      </div>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider pt-2">TikTok</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Handle">
          <Input className={inputClass} placeholder="@handle" {...register('tiktokHandle')} />
        </Field>
        <Field label="Followers" error={errors.tiktokFollowers?.message}>
          <Input
            type="number"
            className={inputClass}
            {...register('tiktokFollowers', {
              setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
            })}
          />
        </Field>
      </div>
      <button type="submit" className={buttonVariants() + ' bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white'} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving...' : 'Save profile'}
      </button>
    </form>
  );
}

function BrandProfileForm({ profile, token, onSave }: { profile?: BrandProfile; token: string; onSave: () => void }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BrandForm>({
    resolver: zodResolver(brandSchema),
  });

  useEffect(() => {
    if (profile) reset(profile as any);
  }, [profile, reset]);

  const mutation = useMutation({
    mutationFn: (data: BrandForm) => brandsApi.updateMe(data as any, token),
    onSuccess: () => { toast.success('Profile updated'); onSave(); },
    onError: (err: any) => toast.error(err?.message ?? 'Update failed'),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company name" error={errors.companyName?.message}>
          <Input className={inputClass} {...register('companyName')} />
        </Field>
        <Field label="Industry" error={errors.industry?.message}>
          <Input className={inputClass} {...register('industry')} />
        </Field>
        <Field label="Website" error={errors.website?.message}>
          <Input className={inputClass} placeholder="https://" {...register('website')} />
        </Field>
        <Field label="Country" error={errors.country?.message}>
          <Input className={inputClass} {...register('country')} />
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
    queryFn: () => influencersApi.getMe(token),
    enabled: !!token && isInfluencer,
  });

  const { data: brandProfile } = useQuery({
    queryKey: ['profile', 'brand'],
    queryFn: () => brandsApi.getMe(token),
    enabled: !!token && !isInfluencer,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['profile'] });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold text-zinc-100">
        {isInfluencer ? 'Influencer Profile' : 'Brand Profile'}
      </h1>
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
